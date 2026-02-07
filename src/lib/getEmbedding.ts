import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { GoogleGenAI } from "@google/genai";

const client = new BedrockRuntimeClient({ 
  region: "us-east-1",
});

export const getEmbedding = async (text: string, retries = 16): Promise<number[]> => {
  // Validate input
  if (!text || text.trim().length === 0) {
    console.warn('Empty text provided to getEmbedding, returning zero vector');
    return new Array(1536).fill(0); // Titan returns 1536 dimensions
  }

  const maxChars = 30000;
  if (text.length > maxChars) {
    console.warn(`Text truncated from ${text.length} to ${maxChars} chars`);
    text = text.substring(0, maxChars);
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // const command = new InvokeModelCommand({
      //   modelId: "amazon.titan-embed-text-v1",
      //   body: JSON.stringify({
      //     inputText: text
      //   }),
      //   contentType: "application/json"
      // });

      // const response = await ai.models.generateContent({
      //   model: "gemini-2.5-flash-lite",
      //   contents: text,
      //   config: {
      //     systemInstruction: "You are an embedding generator. Generate embeddings for the given text.",
      //   },
      // });
      // const responseBody = { embedding: response.embedding ?? [] };
      
      // console.log(`Embedding generated with ${responseBody.embedding.length} dimensions`);
      // return responseBody.embedding;
    const response = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
        config: {
          outputDimensionality: 1536,
        },
    });
    // Determine embedding length safely across possible SDK shapes
    const rawEmb = response.embeddings?.[0];
    const dims = Array.isArray(rawEmb)
      ? rawEmb.length
      : Array.isArray((rawEmb as any)?.embedding)
        ? (rawEmb as any).embedding.length
        : Array.isArray((rawEmb as any)?.values)
          ? (rawEmb as any).values.length
          : 0;
    console.log(`Embedding generated with ${dims} dimensions`);
    // Normalize embedding to number[] regardless of SDK shape
    if (!rawEmb) return [];
    if (Array.isArray(rawEmb)) return rawEmb as number[];
    if (Array.isArray((rawEmb as any).embedding)) return (rawEmb as any).embedding as number[];
    if (Array.isArray((rawEmb as any).values)) return (rawEmb as any).values as number[];
    return [];

    } catch (error: any) {
      const status = error?.$metadata?.httpStatusCode || 'unknown';
      console.error(`Embedding attempt ${attempt}/${retries} failed:`, status, error?.message);

      // Don't retry on 400-level errors
      if (status >= 400 && status < 500) {
        console.error('Client error; not retrying');
        throw error;
      }

      // Retry on 500 errors with exponential backoff
      if (attempt < retries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw new Error('Failed to generate embedding after all retries');
};