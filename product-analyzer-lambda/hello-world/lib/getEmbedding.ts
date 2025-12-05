import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ 
  region: "us-east-1",
});

export const getEmbedding = async (text: string, retries = 3): Promise<number[]> => {
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

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const command = new InvokeModelCommand({
        modelId: "amazon.titan-embed-text-v1",
        body: JSON.stringify({
          inputText: text
        }),
        contentType: "application/json"
      });

      const response = await client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      console.log(`Embedding generated with ${responseBody.embedding.length} dimensions`);
      return responseBody.embedding;
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