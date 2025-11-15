import { GoogleGenerativeAI } from "@google/generative-ai";

// if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not defined");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" }); // Ensure correct embedding model

export const getEmbedding = async (text: string, retries = 3): Promise<number[]> => {
  // Validate input
  if (!text || text.trim().length === 0) {
    console.warn('Empty text provided to getEmbedding, returning zero vector');
    return new Array(768).fill(0); // Return zero vector as fallback
  }

  // Truncate to safe length (Google's model typically handles ~8000 tokens)
  const maxChars = 30000;
  if (text.length > maxChars) {
    console.warn(`Text truncated from ${text.length} to ${maxChars} chars`);
    text = text.substring(0, maxChars);
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.embedContent(text);
      console.log(`Embedding generated with ${result.embedding.values.length} dimensions`);
      return result.embedding.values;
    } catch (error: any) {
      const status = error?.status || 'unknown';
      console.error(`Embedding attempt ${attempt}/${retries} failed:`, status, error?.message);

      // Don't retry on 400-level errors (bad request)
      if (status >= 400 && status < 500) {
        console.error('Client error; not retrying');
        throw error;
      }

      // Retry on 500 errors with exponential backoff
      if (attempt < retries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw new Error('Failed to generate embedding after all retries');
};