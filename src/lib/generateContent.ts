import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { GoogleGenAI } from "@google/genai";

// ─── LLM Provider Switch ───────────────────────────────────────────────────────
// Set to "gemini" or "aws" to choose which LLM backend to use.
const LLM_PROVIDER: "gemini" | "aws" = "aws";
// ──────────────────────────────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION =
  "You are a market expert, you are supposed to provide insights of product and market through analyzing reddit posts. Highligh the subheadings and points wherever required";

// AWS Bedrock setup
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});
const AWS_MODEL_ID = "global.anthropic.claude-sonnet-4-5-20250929-v1:0";

// Gemini setup
if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not defined");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateContent = async (prompt: string): Promise<string> => {
  if (LLM_PROVIDER === "aws") {
    try {
      const command = new ConverseCommand({
        modelId: AWS_MODEL_ID,
        system: [{ text: SYSTEM_INSTRUCTION }],
        messages: [{ role: "user", content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens: 2048, temperature: 0.7 },
      });
      const response = await bedrockClient.send(command);
      return response.output?.message?.content?.[0]?.text ?? "";
    } catch (err: any) {
      console.error("generateContent: Bedrock invoke failed:", {
        message: err?.message,
        name: err?.name,
        fault: err?.$fault,
        statusCode: err?.$metadata?.httpStatusCode,
      });
      throw new Error(`generateContent failed: ${err?.message ?? String(err)}`);
    }
  }

  // Default: Gemini
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });
  return response.text ?? "";
};
