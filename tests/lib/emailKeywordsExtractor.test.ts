import { userFactory } from "@tests/support/factories/users";
import { describe, expect, it, vi } from "vitest";
import * as aiModule from "@/lib/ai";
import { MINI_MODEL } from "@/lib/ai/core";
import { emailKeywordsExtractor } from "@/lib/emailKeywordsExtractor";

vi.mock("@/lib/ai", async () => {
  const actual = await vi.importActual("@/lib/ai");
  return {
    ...actual,
    runAIQuery: vi.fn(),
  };
});

describe("emailKeywordsExtractor", () => {
  it("returns email keywords", async () => {
    vi.mocked(aiModule.runAIQuery).mockResolvedValue({ text: "global affiliate gumroad" } as any);

    const { mailbox } = await userFactory.createRootUser();

    vi.mocked(aiModule.runAIQuery).mockResolvedValue({ text: "global affiliate gumroad" } as any);

    const keywords = await emailKeywordsExtractor({
      mailbox,
      subject: "Recent purchase failed",
      body: "How do I become a global affiliate on Gumroad?",
    });

    expect(keywords.toSorted()).toEqual(["global", "affiliate", "gumroad"].toSorted());

    expect(aiModule.runAIQuery).toHaveBeenCalledWith({
      functionId: "email-keywords-extractor",
      mailbox,
      queryType: "email_keywords_extractor",
      messages: [
        {
          role: "user",
          content: "Recent purchase failed\n\nHow do I become a global affiliate on Gumroad?",
        },
      ],
      system: expect.stringContaining("Generate a space-delimited list of 1-3 keywords"),
      temperature: 0,
      model: MINI_MODEL,
      maxTokens: 500,
    });
  });
});
