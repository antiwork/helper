import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createProviderRegistry } from "ai";
import { env } from "../env";

// import { createXai } from "@ai-sdk/xai";
export const registry = createProviderRegistry({
  google: createGoogleGenerativeAI({
    apiKey: env.AI_API_KEY,
  }),
  openai: createOpenAI({
    apiKey: env.AI_API_KEY,
  }),
  //   xai: createXai({
  //     apiKey: env.AI_API_KEY,
  //   }),
});
