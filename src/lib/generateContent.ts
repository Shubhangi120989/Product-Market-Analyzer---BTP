import { GoogleGenerativeAI } from "@google/generative-ai";
if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not defined");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" , systemInstruction: "You are a market expert, you are supposed to provide insights of product and market through analyzing reddit posts.",});
export const generateContent = async (prompt: string): Promise<string> => {
    const result = await model.generateContent(prompt);
    // console.log(result.response.text());
    return result.response.text();
};

export const generateContentStream = async (prompt: string) => {
    // This returns an object with a .stream property
    return model.generateContentStream(prompt);
  };