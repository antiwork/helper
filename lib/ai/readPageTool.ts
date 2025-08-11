import { createHash } from "crypto";
import { z } from "zod";
import { assertDefined } from "@/components/utils/assert";
import { MINI_MODEL } from "@/lib/ai/core";
import { cacheFor } from "@/lib/cache";
import { getMailbox } from "@/lib/data/mailbox";
import { env } from "@/lib/env";
import { runAIObjectQuery } from "./index";

const toolConfigSchema = z.object({
  toolName: z.string().transform((val) => val.toLowerCase().replace(/\s+/g, "_")),
  toolDescription: z.string(),
});

const generateCacheKey = (currentURL: string, email: string): string => {
  const data = `${currentURL}:${email}`;
  return createHash("md5").update(data).digest("hex");
};

const convertHtmlToMarkdown = async (html: string, currentURL: string): Promise<string | null> => {
  const url = "https://r.jina.ai/";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.JINA_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: currentURL,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.text();
};

export const generateReadPageTool = async (
  pageHTML: string,
  currentURL: string,
  email: string,
): Promise<{ toolName: string; toolDescription: string; pageContent: string } | null> => {
  if (!env.JINA_API_TOKEN) return null;

  const cache = cacheFor<{
    toolName: string;
    toolDescription: string;
    pageContent: string;
  }>(generateCacheKey(currentURL, email));
  const cachedResult = await cache.get();

  if (cachedResult) {
    return cachedResult;
  }

  const markdown = await convertHtmlToMarkdown(pageHTML, currentURL);

  const mailbox = assertDefined(await getMailbox());

  if (!markdown) {
    return null;
  }

  const toolConfig = await runAIObjectQuery({
    model: MINI_MODEL,
    system:
      "Based on this markdown content, generate a tool name and description that best represents what this content is about. The tool name should be concise (2-3 words) and the description should explain what kind of information can be found in this content. The tool name must be lowercase with underscores instead of spaces (snake_case).",
    messages: [
      {
        role: "user",
        content: markdown,
      },
    ],
    schema: toolConfigSchema,
    functionId: "generate-read-page-tool",
    mailbox,
    queryType: "read_page_tool",
    temperature: 0.2,
    maxTokens: 1000,
  });

  const result = {
    toolName: toolConfig.toolName,
    toolDescription: toolConfig.toolDescription,
    pageContent: markdown,
  };

  // Cache the result for 1 hour
  await cache.set(result, 60 * 60);

  return result;
};
