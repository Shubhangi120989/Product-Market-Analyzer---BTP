import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: "us-west-2"
});

const modelId = "google.gemma-3-12b-it";

// export const generateContent = async (prompt: string): Promise<string> => {
//   const input = {
//     modelId,
//     contentType: "application/json",
//     accept: "application/json",
//     body: JSON.stringify({
//       messages: [
//         {
//           role: "user",
//           content: [{ text: "You are a market expert, you are supposed to provide insights of product and market through analyzing reddit posts. Highligh the subheadings and points wherever required" }],
//         },
//         {
//           role: "user",
//           content: [{ text: prompt }],
//         },
//       ],
//       inferenceConfig: {
//         max_new_tokens: 2048,
//         temperature: 0.7
//       }
//     })
//   };

//   try {
//     const command = new InvokeModelCommand(input);
//     const response = await client.send(command);

//     // Some SDK builds return a stream/Uint8Array in response.body. Decode safely.
//     const raw = new TextDecoder().decode(response.body);
//     const responseBody = JSON.parse(raw);

//     return responseBody.output?.message?.content?.[0]?.text ?? "";
//   } catch (err: any) {
//     // Provide richer logging for debugging in server logs
//     console.error('generateContent: Bedrock invoke failed:', {
//       message: err?.message,
//       name: err?.name,
//       fault: err?.$fault,
//       statusCode: err?.$metadata?.httpStatusCode,
//       details: err
//     });

//     // Re-throw a clearer error so route handlers can decide how to respond
//     throw new Error(`generateContent failed: ${err?.message ?? String(err)}`);
//   }
// };


// import { GoogleGenerativeAI } from "@google/generative-ai";
// if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not defined");

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" , systemInstruction: "You are a market expert, you are supposed to provide insights of product and market through analyzing reddit posts.",});
// export const generateContent = async (prompt: string): Promise<string> => {
//     const result = await model.generateContent(prompt);
//     // console.log(result.response.text());
//     return result.response.text();
// };

// export const generateContentStream = async (prompt: string) => {
//     // This returns an object with a .stream property
//     return model.generateContentStream(prompt);
//   };

// import {GoogleGenAI} from "@google/genai";

// const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});

// export const generateContent=async(prompt:string):Promise<string>=>{

//     const response = await ai.models.generateContent({
//     model: "gemini-3-pro-preview",
//     contents: prompt,
//   });
//   return response.text ?? "";
// }

// console.log(await generateContent("give me a word"));





import { GoogleGenAI } from "@google/genai";
if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not defined");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


export const generateContent = async (prompt: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
    config: {
      systemInstruction: "You are a market expert, you are supposed to provide insights of product and market through analyzing reddit posts. Highligh the subheadings and points wherever required",
    },
  });
  return response.text ?? "";
}
// async function main() {
//   const response = await ai.models.generateContent({
//     model: "gemini-3-flash-preview",
//     contents: "Hello there",
//     config: {
//       systemInstruction: "You are a cat. Your name is Neko.",
//     },
//   });
//   console.log(response.text);
// }

// await main();