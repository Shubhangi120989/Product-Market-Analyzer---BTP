import { ICompeditor } from "@/models/competitor.model";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not defined");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateCompeditorObject(prompt: string): Promise<ICompeditor | null> {
  const schema = {
    description: "Competitor data object",
    type: SchemaType.OBJECT,
    properties: {
      name: {
        type: SchemaType.STRING,
        description: "Name of the competitor",
        nullable: false,
      },
      description: {
        type: SchemaType.STRING,
        description: "Description of the competitor",
        nullable: false,
      },
      good_points: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "List of good points",
        nullable: true,
        minItems: 2, // Ensure at least 2 good points
      },
      bad_points: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "List of bad points",
        nullable: true,
        minItems: 2, // Ensure at least 2 bad points
      },
    },
    required: ["name", "description", "good_points", "bad_points"],
  };

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema as any,
    },
  });

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    if (!responseText) {
      throw new Error("No response from the model.");
    }

    const parsedResponse: ICompeditor = JSON.parse(responseText);
    console.log("Generated competitor data:", parsedResponse);
    return parsedResponse;
  } catch (error) {
    console.error("Error generating competitor data:", error);
    return null;
  }
}


  export { generateCompeditorObject };
