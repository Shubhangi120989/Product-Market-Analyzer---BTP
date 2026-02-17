import { GoogleGenerativeAI } from "@google/generative-ai";

const keys = (process.env.GEMINI_API_KEYS_LAMBDA || "").split(",");
let currentKeyIndex = 0;

function getNextClient() {
  if (keys.length === 0) {
    throw new Error("No Gemini API keys configured");
  }

  const key = keys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;

  return new GoogleGenerativeAI(key);
}

export const generateContent = async (prompt: string): Promise<string> => {
  try {
    const genAI = getNextClient();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction:
        "You are a market expert, you are supposed to provide insights of product and market through analyzing reddit posts.",
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
      },
    });

    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Error generating content with Gemini:", error);
    // Throwing error ensures the caller knows the generation failed
    throw new Error(`Gemini generation failed: ${error.message}`);
  }
};

