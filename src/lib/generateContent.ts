import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: "us-east-1"
});

const modelId = "amazon.nova-lite-v1:0";

export const generateContent = async (prompt: string): Promise<string> => {
  const input = {
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: [{ text: "You are a market expert, you are supposed to provide insights of product and market through analyzing reddit posts." }],
        },
        {
          role: "user",
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        max_new_tokens: 2048,
        temperature: 0.7
      }
    })
  };

  const command = new InvokeModelCommand(input);
  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  return responseBody.output.message.content[0].text;
};