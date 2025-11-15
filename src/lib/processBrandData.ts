// import axios from 'axios';
// import crypto from 'crypto';
import { getEmbedding } from './getEmbedding';
import { fetchRedditPosts, RedditPost } from './redditUtils';
import { generateCompeditorObject } from './generateCompetitorData';
import { BrandInfo } from './getTopBrands';
import cosineSimilarity from './cosineSimilariy';


/**
 * Processes brand data by fetching Reddit posts, performing similarity search to
 * determine good and bad points, and then generating a competitor object using Gemini.
 *
 * @param brandName - The name of the brand
 * @param brandInfo - Object containing additional brand details
 * @param productCategory - The product category to search for
 * @returns A Promise resolving to the competitor data object
 */
export const processBrandData = async (
  brandInfo: BrandInfo,
  product_category: string
): Promise<any> => {
  // Build the search query using the first letter of the brand and the product category
  const searchQuery = brandInfo.brand + " " + product_category;
  
  // Fetch Reddit posts (top ~70 posts are returned, and embedding is computed within)
  const redditPosts: RedditPost[] = await fetchRedditPosts(searchQuery,50);

  // Define two query phrases for good and bad points, and compute their embeddings
  const goodQueryText = "good points about the product";
  const badQueryText = "bad points about the product";

  const [goodQueryEmbedding, badQueryEmbedding] = await Promise.all([
    getEmbedding(goodQueryText),
    getEmbedding(badQueryText)
  ]);

  // Compute similarity scores for each post against the good and bad queries
  const postsWithGoodScore = redditPosts.map((post) => ({
    post,
    similarity: cosineSimilarity(post.vector, goodQueryEmbedding)
  }));

  const postsWithBadScore = redditPosts.map((post) => ({
    post,
    similarity: cosineSimilarity(post.vector, badQueryEmbedding)
  }));

  // Sort the posts by similarity (highest first) and take the top 10 posts for each category
  postsWithGoodScore.sort((a, b) => b.similarity - a.similarity);
  postsWithBadScore.sort((a, b) => b.similarity - a.similarity);

  const topGoodPosts = postsWithGoodScore.slice(0, 10).map(item => item.post);
  const topBadPosts = postsWithBadScore.slice(0, 10).map(item => item.post);

  // Aggregate the titles and selftexts from the selected posts for both good and bad points
  // const goodText = topGoodPosts
  //   .map(p => `${p.payload.title}\n${p.payload.selftext}`)
  //   .join("\n---\n");
  // const badText = topBadPosts
  //   .map(p => `${p.payload.title}\n${p.payload.selftext}`)
  //   .join("\n---\n");

  // Create the prompt including brand information and the aggregated Reddit content
  const prompt = `Brand: ${brandInfo.brand}
Rating: ${brandInfo.rating}
Reviews: ${brandInfo.reviews}
Price: ${brandInfo.price}
Snippet: ${brandInfo.snippet}

Based on the following Reddit posts, please identify the good and bad points of the product:

Good points from posts:
${topGoodPosts.map((p, index) => `${index + 1}. ${p.payload.title}\n${p.payload.selftext}`).join("\n---\n")}

Bad points from posts:
${topBadPosts.map((p, index) => `${index + 1}. ${p.payload.title}\n${p.payload.selftext}`).join("\n---\n")}`;

// console.log("prompt: ",prompt)

  // Generate the competitor object using the Gemini API
  const competitorData = await generateCompeditorObject(prompt);
  return competitorData;
};
