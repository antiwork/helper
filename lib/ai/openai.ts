import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/lib/env";

const openai = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
  compatibility: "strict",
});

export default openai;
