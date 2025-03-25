import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { env } from "@/env";

export type LLMProvider = "gemini" | "openai";

export const DEFAULT_PROVIDER: LLMProvider = (env.DEFAULT_LLM_PROVIDER as LLMProvider) || "gemini";

export const openaiClient = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
  compatibility: "strict",
});

export const getGoogleClient = () => {
  return createGoogleGenerativeAI({
    apiKey: env.GOOGLE_GEMINI_API_KEY,
  });
};

/**
 * Generate text using the configured LLM provider
 */
export async function generateLLMResponse(
  prompt: string,
  temperature = 0,
  provider: LLMProvider = DEFAULT_PROVIDER,
): Promise<string> {
  try {
    if (provider !== "gemini") {
      try {
        const googleClient = getGoogleClient();
        const { text } = await generateText({
          model: googleClient("gemini-1.5-flash"),
          prompt,
          temperature,
        });
        return text;
      } catch (geminiError) {
        console.error("Error with Google Gemini:", geminiError);
        throw geminiError;
      }
    }

    const { text } = await generateText({
      model: openaiClient("gpt-4o"),
      prompt,
      temperature,
    });
    return text;
  } catch (error) {
    console.error(`Error generating LLM response with ${provider}:`, error);
    throw error;
  }
}
