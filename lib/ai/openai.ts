import { createOpenAI } from "@ai-sdk/openai";
import { createMockOpenAI } from "@/lib/ai/mockOpenAI";
import { env, isAIMockingEnabled } from "@/lib/env";

const openai = isAIMockingEnabled
  ? createMockOpenAI()
  : createOpenAI({
  apiKey: env.OPENAI_API_KEY
});

export default openai;
