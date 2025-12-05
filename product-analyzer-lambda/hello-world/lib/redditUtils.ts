import axios from 'axios';
import crypto from 'crypto';
import { getEmbedding } from './getEmbedding';
import { generateContent } from './generateContent';

const stopwords = [
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in', 'into', 'is', 'it',
  'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the', 'their', 'then', 'there', 'these', 'they',
  'this', 'to', 'was', 'will', 'with', 'you', 'your', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'has', 'have', 'had', 'do', 'does', 'did', 'would', 'could', 'should',
];

// Define the types for comments and posts
export interface RedditComment {
  text: string;
  upvotes: number;
}

export interface RedditPostPayload {
  name: string;
  title: string;
  url: string;
  selftext: string;
  author: string;
  subreddit: string;
  upvotes: number;
  comments: RedditComment[];
}

export interface RedditPost {
  id: string;
  vector: number[]; // Assuming getEmbedding returns a numeric vector
  payload: RedditPostPayload;
}

function enhancePreprocess(text: string, maxBytes = 35000): string {
  let t = text.toLowerCase();

  // Basic cleanup
  t = t.replace(/https?:\/\/\S+/g, '');
  t = t.replace(/<[^>]*>/g, '');

  // Stopword removal
  const words = t.split(/\s+/).filter((w) => w && !stopwords.includes(w));
  t = words.join(' ');

  // Punctuation cleanup and size cap
  t = t.replace(/[^\w\s]|_/g, '');
  t = t.replace(/\s+/g, ' ').trim();

  if (Buffer.byteLength(t, 'utf-8') > maxBytes) t = t.slice(0, maxBytes);
  return t;
}

// 1. Predefined synonym dictionary (expand as needed)
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  "phone": ["mobile", "smartphone", "cellphone", "handset", "android phone", "ios phone"],
  "mobile": ["phone", "smartphone", "cellphone"],
  "smartphone": ["phone", "mobile", "cellphone"],

  "laptop": ["notebook", "macbook", "ultrabook", "pc laptop"],
  "notebook": ["laptop", "macbook"],
  "macbook": ["laptop", "notebook"],

  "earbuds": ["earphones", "earpods", "headphones", "ear buds"],
  "headphones": ["earbuds", "earphones", "headset"],

  "camera": ["dslr", "mirrorless", "cam", "action cam", "action camera"],
};

// 2. Expand from category using dictionary
function expandCategory(category: string): string[] {
  const c = category.toLowerCase().trim();
  const direct = CATEGORY_SYNONYMS[c] ?? [];
  return [...direct];
}

// 3. Utility: split product name into clean keywords
function splitProductName(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[\s\-]+/)  // split by spaces or hyphens
    .filter(w => w.length > 1); // remove useless 1-letter tokens
}

// 4. Call LLM to get slang + variants (Approach 2)
async function generateLLMKeywords(productName: string, productCategory: string, description: string): Promise<string[]> {
  const prompt = `
You are an expert in e-commerce and online forums.
Given a product name, category, and description, generate a list of 5-6 alternate keywords, slang, short forms, abbreviations,
and variations that people commonly use on Reddit.

Return ONLY a comma-separated list of phrases.

Product Name: ${productName}
Category: ${productCategory}
Description: ${description}
  `;

  try {
    const responseText = await generateContent(prompt); 
    return responseText
      .toLowerCase()
      .split(',')
      .map((k: string) => k.trim())
      .filter(Boolean);
  } catch (error) {
    console.error('Error generating LLM keywords:', error);
    return [];
  }
}

// 5. The final function to create the expanded keyword set
export async function getExpandedKeywords(
  productName: string,
  productCategory: string,
  productDescription: string
): Promise<Set<string>> {

  const keywords = new Set<string>();

  // A. Product name tokens
  splitProductName(productName).forEach(w => keywords.add(w));

  // B. Full category word
  keywords.add(productCategory.toLowerCase());

  // C. Category synonyms
  const catSyns = expandCategory(productCategory);
  catSyns.forEach(s => keywords.add(s));

  // D. LLM-generated slang & variants
  const llmKeywords = await generateLLMKeywords(productName, productCategory, productDescription);
  llmKeywords.forEach(k => keywords.add(k));

  // E. Add full product name variants
  keywords.add(productName.toLowerCase());

  return keywords;
}

/**
 * Generate static variant queries for broader retrieval
 */
function getVariantQueries(productName: string): string[] {
  return [
    productName,
    `${productName} review`,
    `${productName} issues`,
    `${productName} features`,
  ];
}

// Function to obtain the OAuth access token using client credentials
export const getRedditAccessToken = async (): Promise<string> => {
  const clientId = process.env.REDDIT_CLIENT_ID!;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET!;
  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const tokenUrl = 'https://www.reddit.com/api/v1/access_token';
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');

  const response = await axios.post(tokenUrl, params, {
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return response.data.access_token;
};

/**
 * Main function to fetch posts and comments using the OAuth token
 */
export const fetchRedditPosts = async (product_name: string, product_category:string, product_description:string, limit: number): Promise<RedditPost[]> => {
  console.log("Fetching Reddit posts for:", product_name);
  
  // Get the access token first
  const accessToken = await getRedditAccessToken();

  // Build a set to deduplicate across variant queries
  const seenUrls: Set<string> = new Set();

  // Retrieve posts using the static variant queries
  const variantQueries = getVariantQueries(product_name);
  console.log("Variant queries:", variantQueries);

  // Collect all posts from variant queries (avoid duplicates)
  const allPostData: RedditPost[] = [];
  
  //get keywords for the first-pass filter
  const keywords = await getExpandedKeywords(product_name, product_category, product_description);
  console.log("Keywords:", [...keywords]);
  
  for (const q of variantQueries) {
    const searchUrl = `https://oauth.reddit.com/search?q=${encodeURIComponent(q)}&limit=${limit}&sort=relevance`;

    const searchResponse = await axios.get(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'your-app/1.0.0',
      },
    });

    const posts = searchResponse.data?.data?.children;
    console.log("Fetched posts for query:", q, "count:", posts?.length || 0);
    if (!posts || posts.length === 0) continue;

    // Process each post
    await Promise.all(
      posts.map(async (post: any) => {
        const { title, permalink, author, subreddit, selftext, ups } = post.data;
        const postUrl = `https://www.reddit.com${permalink}`;

        // Deduplication
        if (seenUrls.has(postUrl)) return;
        seenUrls.add(postUrl);

        // Gather comments
        const oauthCommentsUrl = `https://oauth.reddit.com${permalink}.json?limit=3`;
        const publicCommentsUrl = `${postUrl}.json?limit=3`;

        let comments: RedditComment[] = [];
        try {
          const commentsResponse = await axios.get(oauthCommentsUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'User-Agent': 'your-app/1.0.0',
            },
            timeout: 50000,
          });

          comments = commentsResponse.data[1]?.data?.children
            .filter((comment: any) => comment.kind === 't1')
            .slice(0, 3)
            .map((comment: any) => ({
              text: comment.data.body,
              upvotes: comment.data.ups,
            })) || [];
        } catch (err) {
          // Fallback to public endpoint
          console.warn('OAuth comments fetch failed, falling back to public endpoint');
          try {
            const fallbackResp = await axios.get(publicCommentsUrl, {
              headers: { 'User-Agent': 'your-app/1.0.0' },
              timeout: 50000,
            });
            comments = fallbackResp.data[1]?.data?.children
              .filter((comment: any) => comment.kind === 't1')
              .slice(0, 3)
              .map((comment: any) => ({
                text: comment.data.body,
                upvotes: comment.data.ups,
              })) || [];
          } catch (fallbackErr) {
            console.error('Error fetching comments (both oauth and public failed):', fallbackErr);
          }
        }
        console.log(`Fetched ${comments.length} comments for post: ${postUrl}`);

        // Combine the post title, selftext, and comments into one text string
        const rawText = `${title} ${selftext} \n The top comments to this post are: \n${comments.map((c) => c.text).join('\n')}`;

        // First-pass keyword filter (fast prune)
        const textForKeywordCheck = (title).toLowerCase();
        const hasKeyword = Array.from(keywords).some((k) => textForKeywordCheck.includes(k));
        if (!hasKeyword) {
          return;
        }

        // Enhanced preprocessing before embedding
        const cleanedText = enhancePreprocess(rawText);

        // Generate embedding
        let postEmbedding: number[];
        try {
          postEmbedding = await getEmbedding(cleanedText);
        } catch (embeddingError) {
          console.error(`Failed to embed post "${title}":`, embeddingError);
          return; // Skip this post and continue
        }

        const postPayload: RedditPostPayload = {
          name: product_name,
          title,
          url: postUrl,
          selftext,
          author,
          subreddit,
          upvotes: ups,
          comments,
        };

        allPostData.push({
          id: crypto.createHash('md5').update(postUrl).digest('hex'),
          vector: postEmbedding,
          payload: postPayload,
        });
      })
    );
  }

  // Return deduplicated, filtered list
  const unique = new Map<string, RedditPost>();
  for (const p of allPostData) {
    unique.set(p.id, p);
  }
  return Array.from(unique.values());
};