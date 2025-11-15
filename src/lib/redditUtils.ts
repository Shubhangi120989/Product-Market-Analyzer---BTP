import axios from 'axios';
import crypto from 'crypto';
import { getEmbedding } from './getEmbedding';
import { generateContent } from "@/lib/generateContent";

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
function nlpPreprocess(text: string): string {
  let processed = text.toLowerCase();
  // Remove URLs
  processed = processed.replace(/https?:\/\/\S+/g, '');
  // Remove HTML tags
  processed = processed.replace(/<[^>]*>/g, '');
  // Remove punctuation and special characters (keep letters, numbers and whitespace)
  processed = processed.replace(/[^\w\s]|_/g, '');
  // Replace multiple spaces with a single space and trim
  processed = processed.replace(/\s+/g, ' ').trim();
  return processed;
}

/**
 * Further ensures the text does not exceed the maximum byte size.
 *
 * @param text - The text to possibly truncate.
 * @param maxBytes - Maximum allowed size in bytes (default: 35000).
 * @returns The text truncated to the maximum allowed size.
 */
function truncateToByteLimit(text: string, maxBytes = 35000): string {
  if (Buffer.byteLength(text, "utf-8") > maxBytes) {
    // Truncate by characters as an approximation.
    text = text.slice(0, maxBytes);
  }
  return text;
}

/**
 * Combines NLP preprocessing with a byte limit check.
 *
 * @param input - The raw input text.
 * @param maxBytes - Maximum allowed size in bytes.
 * @returns The preprocessed text.
 */
function preprocessText(input: string, maxBytes = 35000): string {
  // Apply NLP preprocessing steps
  let processed = nlpPreprocess(input);
  // Then truncate if necessary
  processed = truncateToByteLimit(processed, maxBytes);
  return processed;
}

const emojiMap: Record<string, string> = {
  "🙂": ":slightly_smiling_face:",
  "😀": ":grinning_face:",
  "😃": ":smiling_face_with_big_eyes:",
  "😄": ":smiling_face_with_smiling_eyes:",
  "😁": ":beaming_face_with_smiling_eyes:",
  "😆": ":laughing:",
  "😂": ":joy:",
  "🤣": ":rolling_on_the_floor_laughing:",
  "😅": ":smiling_face_with_sweat:",
  "😊": ":smiling_face_with_smiling_eyes:",
  "😇": ":innocent:",
  "😉": ":wink:",
  "😍": ":heart_eyes:",
  "😘": ":face_blowing_a_kiss:",
  "😗": ":kissing_face:",
  "😋": ":face_savoring_food:",
  "😜": ":winking_face_with_tongue:",
  "🤪": ":zany_face:",
  "😝": ":squinting_face_with_tongue:",
  "🤗": ":hugging_face:",
  "🤔": ":thinking_face:",
  "🤨": ":face_with_raised_eyebrow:",
  "😐": ":neutral_face:",
  "😑": ":expressionless_face:",
  "😶": ":face_without_mouth:",
  "🙄": ":face_with_rolling_eyes:",
  "😏": ":smirking_face:",
  "😒": ":unamused_face:",
  "🙃": ":upside_down_face:",
  "😔": ":pensive_face:",
  "😞": ":disappointed_face:",
  "😟": ":worried_face:",
  "😢": ":crying_face:",
  "😭": ":loudly_crying_face:",
  "😤": ":face_with_steam_from_nose:",
  "😠": ":angry_face:",
  "😡": ":pouting_face:",
  "🤬": ":face_with_symbols_over_mouth:",
  "🤯": ":exploding_head:",
  "😳": ":flushed_face:",
  "🥺": ":pleading_face:",
  "😬": ":grimacing_face:",
  "🤢": ":nauseated_face:",
  "🤮": ":face_vomiting:",
  "🤧": ":sneezing_face:",
  "😷": ":face_with_medical_mask:",
  "💀": ":skull:",
  "☠️": ":skull_and_crossbones:",
  "👻": ":ghost:",
  "💩": ":pile_of_poo:",
  "🤡": ":clown_face:",
  "👽": ":alien:",
  "🤖": ":robot_face:",
  "❤️": ":red_heart:",
  "💔": ":broken_heart:",
  "💕": ":two_hearts:",
  "💞": ":revolving_hearts:",
  "💖": ":sparkling_heart:",
  "💗": ":growing_heart:",
  "💘": ":heart_with_arrow:",
  "💝": ":heart_with_ribbon:",
  "💓": ":beating_heart:",
  "💙": ":blue_heart:",
  "💚": ":green_heart:",
  "💛": ":yellow_heart:",
  "🧡": ":orange_heart:",
  "🖤": ":black_heart:",
  "🤍": ":white_heart:",
  "🔥": ":fire:",
  "⭐": ":star:",
  "🌟": ":glowing_star:",
  "✨": ":sparkles:",
  "💫": ":dizzy:",
  "⚡": ":high_voltage:",
  "☀️": ":sun:",
  "🌈": ":rainbow:",
  "❄️": ":snowflake:",
  "🌧️": ":cloud_with_rain:",
  "🌙": ":crescent_moon:",
  "💤": ":zzz:",
  "🎉": ":party_popper:",
  "🎊": ":confetti_ball:",
  "👏": ":clapping_hands:",
  "🙌": ":raising_hands:",
  "👍": ":thumbs_up:",
  "👎": ":thumbs_down:",
  "👊": ":fist_bump:",
  "🤝": ":handshake:",
  "🙏": ":folded_hands:",
  "🤞": ":crossed_fingers:",
  "🤟": ":love_you_gesture:",
  "🤘": ":sign_of_the_horns:",
  "👌": ":ok_hand:",
  "✌️": ":victory_hand:",
  "💪": ":flexed_biceps:",
  "🧠": ":brain:",
  "🫶": ":heart_hands:",
  "💅": ":nail_polish:",
  "👀": ":eyes:",
  "🫠": ":melting_face:",
  "🤫": ":shushing_face:",
  "🤭": ":face_with_hand_over_mouth:",
  "🥳": ":partying_face:",
  "🥲": ":smiling_with_tear:",
  "🤑": ":money_face:",
  "🤤": ":drooling_face:",
  "😴": ":sleeping_face:",
  "😎": ":smiling_face_with_sunglasses:",
  "🚀": ":rocket:",
  "💯": ":100:",
  "🎯": ":bullseye:",
  "📈": ":chart_increasing:",
  "📉": ":chart_decreasing:",
  "🛠️": ":tools:",
  "🛒": ":shopping_cart:",
  "💻": ":laptop:",
  "📱": ":mobile_phone:",
  "🎮": ":video_game:",
  "🎧": ":headphones:",
  "⌚": ":watch:"
};


const slangMap: Record<string, string> = {
  "afaik": "as far as i know",
  "ama": "ask me anything",
  "asap": "as soon as possible",
  "atm": "at the moment",
  "b4": "before",
  "bc": "because",
  "bday": "birthday",
  "bf": "boyfriend",
  "bff": "best friend forever",
  "brb": "be right back",
  "btw": "by the way",
  "cant": "cannot",
  "cuz": "because",
  "dm": "direct message",
  "diy": "do it yourself",
  "eta": "estimated time of arrival",
  "fml": "f*** my life",
  "ftw": "for the win",
  "fwiw": "for what it's worth",
  "fyi": "for your information",
  "gf": "girlfriend",
  "gg": "good game",
  "gl": "good luck",
  "gn": "good night",
  "gr8": "great",
  "gtg": "got to go",
  "hbu": "how about you",
  "hmu": "hit me up",
  "idc": "i don't care",
  "idk": "i don't know",
  "ikr": "i know right",
  "ily": "i love you",
  "imo": "in my opinion",
  "imho": "in my humble opinion",
  "irl": "in real life",
  "jk": "just kidding",
  "js": "just saying",
  "lmao": "laughing my ass off",
  "lmfao": "laughing my f***ing ass off",
  "lol": "laugh out loud",
  "lmk": "let me know",
  "nvm": "never mind",
  "noob": "newbie",
  "nsfw": "not safe for work",
  "nyc": "new york city",
  "oof": "ouch",
  "op": "original poster",
  "omg": "oh my god",
  "omw": "on my way",
  "pls": "please",
  "plz": "please",
  "pov": "point of view",
  "prolly": "probably",
  "rly": "really",
  "rofl": "rolling on the floor laughing",
  "rt": "retweet",
  "smh": "shaking my head",
  "srsly": "seriously",
  "sus": "suspicious",
  "tbh": "to be honest",
  "tbf": "to be fair",
  "tbt": "throwback thursday",
  "tfw": "that feeling when",
  "thx": "thanks",
  "tho": "though",
  "tl;dr": "too long didnt read",
  "tldr": "too long didnt read",
  "ty": "thank you",
  "u": "you",
  "ur": "your",
  "wbu": "what about you",
  "wdym": "what do you mean",
  "wfh": "work from home",
  "wth": "what the hell",
  "wtf": "what the f***",
  "wtv": "whatever",
  "xoxo": "hugs and kisses",
  "ya": "yeah",
  "yolo": "you only live once",
  "yw": "you’re welcome"
};


function enhancePreprocess(text: string, maxBytes = 35000): string {
  let t = text.toLowerCase();

  // Basic cleanup
  t = t.replace(/https?:\/\/\S+/g, '');
  t = t.replace(/<[^>]*>/g, '');

  // Optional: spell correction placeholder (implement or integrate if needed)
  // t = correctSpelling(t);

  // Emoji normalization
  for (const [emoji, tag] of Object.entries(emojiMap)) {
    t = t.split(emoji).join(tag);
  }

  // Slang/acronym expansion
  for (const [slang, full] of Object.entries(slangMap)) {
    t = t.replace(new RegExp(`\\b${slang}\\b`, 'gi'), full);
  }

  // Stopword removal
  const words = t.split(/\s+/).filter((w) => w && !stopwords.includes(w));
  t = words.join(' ');

  // Punctuation cleanup and size cap
  t = t.replace(/[^\w\s]|_/g, '');
  t = t.replace(/\s+/g, ' ').trim();

  if (Buffer.byteLength(t, 'utf-8') > maxBytes) t = t.slice(0, maxBytes);
  return t;
}

/**
 * Public helper: enhanced preprocessing used before embedding
 */
function enhancedPreprocess(text: string, maxBytes = 35000): string {
  return enhancePreprocess(text, maxBytes);
}

/**
 * Relevance scoring (0..1) using an LLM (inline with your existing generateContent)
 * Returns 0 if scoring fails.
 */
async function scoreRelevance(productName: string, productCategory:string, productDescription:string, text: string): Promise<number> {
  console.log("in score relevance function"); 
  const prompt = `
You are evaluating the relevance of a Reddit post for use in a Retrieval-Augmented Generation (RAG) system that provides insights about a specific product. 
Be *liberal* in assigning relevance scores — even loosely related discussions can provide valuable context for understanding user sentiment, product features, comparisons, or use cases.

Product Name: "${productName}"
Product Category: "${productCategory}"
Product Description: "${productDescription}"

Reddit Post Relevance Evaluation:

Your task is to rate how useful this Reddit post (including its title, body, and comments) could be in understanding or generating insights about the product, either directly or indirectly. 

Important considerations:
- A post should be considered relevant if:
  - It mentions the product, its brand, or any similar/related products in the same category (e.g., if the product is a "laptop", a post about "Dell" or "MacBook" is relevant).
  - It discusses problems, opinions, or features that apply to this type of product.
  - It contains general discussions, comparisons, or recommendations about products in the same category.
  - It includes indirect insights such as usage experience, performance, pricing, or satisfaction, even if not naming the product explicitly.

The only cases that should score *0* are posts entirely unrelated to the product, its category, or any discussion that could provide product-relevant insights.
 Mark the post as **not relevant (0)** only if:
  - It has no connection to the product or its category.
  - It is purely off-topic or unrelated to any products or experiences in that domain.
Reddit Post Text:
${text}

Rate the relevance on a continuous scale from 0 to 1, where:
- 0 = Completely unrelated (no connection to the product or its category)
- 0.3 = Marginally related (weak mention or vague contextual overlap)
- 0.6 = Moderately relevant (discusses similar products, brands, or experiences)
- 1 = Highly relevant (directly discusses the product or closely related models)

IMPORTANT: Respond with ONLY a single number between 0 and 1. 
Do not include any explanation, commentary, or extra text.
`;


  try {
    const result = await generateContent(prompt);
    console.log("result from the LLM regarding relevance of the post:", result);
    const val = parseFloat(result);    
    if (isNaN(val)) return 0;
    return Math.max(0, Math.min(1, val));
  } catch {
    return 0;
  }
}

/**
 * Generate static variant queries for broader retrieval
 * This is a static list approach; adapt to your fetch logic
 */
function getVariantQueries(productName: string): string[] {
  return [
    productName,
    `${productName} review`,
    `${productName} issues`,
    `${productName} features`,
  ];
}

const RELEVANCE_THRESHOLD = 0.1;

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
  // Replace this with your actual LLM provider (OpenAI, Together, Gemini, etc.)
  
  const prompt = `
You are an expert in e-commerce and online forums.
Given a product name, category, and description, generate a list of 5-6 alternate keywords, slang, short forms, abbreviations,
and variations that people commonly use on Reddit.

Return ONLY a comma-separated list of phrases.

Product Name: ${productName}
Category: ${productCategory}
Description: ${description}
  `;

  const responseText = await generateContent(prompt); 
  // expected: "iphone, apple phone, ios phone, i15, 15 pro, 15pm, ..." 

  return responseText
    .toLowerCase()
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);
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
 * Modified to incorporate:
 * - variant queries (broadened retrieval)
 * - deduplication
 * - first-pass keyword filter
 * - LLM-based relevance scoring
 * - enhanced normalization
 */

// Main function to fetch posts and comments using the OAuth token
export const fetchRedditPosts = async (product_name: string, product_category:string, product_description:string, limit: number): Promise<RedditPost[]> => {
  console.log("hi in the fetch reddit posts function");
  // Get the access token first
  const accessToken = await getRedditAccessToken();

  // Build a set to deduplicate across variant queries
  const seenUrls: Set<string> = new Set();

  // Retrieve posts using the static variant queries (sequential or parallel as desired)
  const variantQueries = getVariantQueries(product_name);
  console.log("Variant queries:", variantQueries);

  // Collect all posts from variant queries (avoid duplicates)
  const allPostData: RedditPost[] = [];
  
  //get keywords for the first-pass filter
  const keywords = await getExpandedKeywords(product_name, product_category, product_description);
  console.log([...keywords])
  for (const q of variantQueries) {
    const searchUrl = `https://oauth.reddit.com/search?q=${encodeURIComponent(q)}&limit=${limit}&sort=relevance`;

    const searchResponse = await axios.get(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'your-app/1.0.0',
      },
    });

    const posts = searchResponse.data?.data?.children;
    console.log("fetched posts for query:", q, "count:", posts?.length || 0);
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
          console.warn('oauth comments fetch failed, falling back to public endpoint:', (err as any)?.code || (err as any)?.message);
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
            console.error('Error fetching comments (both oauth and public failed):', (fallbackErr as any)?.code || (fallbackErr as any)?.message);
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

        // LLM-based relevance scoring
        // const score = await scoreRelevance(product_name, product_category, product_description, rawText);
        // console.log("Relevance score:", score)
        // if (score < RELEVANCE_THRESHOLD) {
        //   return;
        // }

        // console.log("----------------")

        // Enhanced preprocessing before embedding
        const cleanedText = enhancePreprocess(rawText);

        // Generate embedding
        let postEmbedding: number[];
        try {
          postEmbedding = await getEmbedding(cleanedText);
        } catch (embeddingError) {
          console.error(`Failed to embed post "${title}":`, (embeddingError as any)?.message);
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
  // Note: there might still be duplicates across variant queries; we dedup by id here
  const unique = new Map<string, RedditPost>();
  for (const p of allPostData) {
    unique.set(p.id, p);
  }
  return Array.from(unique.values());
};