import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const VECTOR_DIM = 1536;

export const getEmbedding = async (
  text: string,
  retries = 3
): Promise<number[]> => {

  if (!text || text.trim().length === 0) {
    console.warn("Empty text provided, returning zero vector");
    return new Array(VECTOR_DIM).fill(0);
  }

  const maxChars = 30000;
  if (text.length > maxChars) {
    text = text.substring(0, maxChars);
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {

      const response = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: text,
        config: {
          outputDimensionality: VECTOR_DIM,
        },
      });

      const rawEmb = response.embeddings?.[0];

      let embedding: number[] | undefined;

      if (Array.isArray(rawEmb)) {
        embedding = rawEmb;
      } else if (Array.isArray((rawEmb as any)?.embedding)) {
        embedding = (rawEmb as any).embedding;
      } else if (Array.isArray((rawEmb as any)?.values)) {
        embedding = (rawEmb as any).values;
      }

      if (!embedding || embedding.length !== VECTOR_DIM) {
        throw new Error("Invalid embedding returned from Gemini");
      }

      console.log(`Embedding generated (${embedding.length} dims)`);

      return embedding;

    } catch (error: any) {
      const status = error?.status || error?.$metadata?.httpStatusCode;

      console.error(
        `Attempt ${attempt}/${retries} failed`,
        status,
        error?.message
      );

      if (status && status >= 400 && status < 500) {
        throw error; // don't retry client errors
      }

      if (attempt < retries) {
        const delay = 500 * attempt; // safer for Lambda
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw new Error("Embedding failed after retries");
      }
    }
  }

  throw new Error("Embedding failed unexpectedly");
};
