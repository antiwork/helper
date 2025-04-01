import { openai } from "@ai-sdk/openai";
import { createDataStreamResponse, streamText, tool } from "ai";
import { z } from "zod";

export async function POST(req: Request) {
  const { messages } = await req.json();

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const result = streamText({
        model: openai("gpt-4o"),
        messages,
        tools: {
          getWeatherInformation: tool({
            description: "show the weather in a given city to the user",
            parameters: z.object({ city: z.string() }),
            execute: async ({}: { city: string }) => {
              const weatherOptions = ["sunny", "cloudy", "rainy", "snowy"];
              return weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
            },
          }),
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
  });
}
