import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/lib/env";
import { createMockOpenAI, isMockingEnabled } from "./mockOpenAI";

const openai = isMockingEnabled()
  ? createMockOpenAI()
  : createOpenAI({
      apiKey: env.OPENAI_API_KEY,
      compatibility: "strict",
    });

export default openai;
