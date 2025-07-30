import { createOpenAI } from "@ai-sdk/openai";
import { createMockOpenAI, isMockingEnabled } from "@/lib/ai/mockOpenAI";
import { env } from "@/lib/env";

const openai = isMockingEnabled()
  ? createMockOpenAI()
  : createOpenAI({
      apiKey: env.OPENAI_API_KEY,
      compatibility: "strict",
    });

export default openai;
