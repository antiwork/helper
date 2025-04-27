import { User } from "@clerk/nextjs/server";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { GPT_4O_MODEL } from "@/lib/ai/core";
import openai from "@/lib/ai/openai";
import { slugify } from "@/lib/auth/slugify";

export const generateMailboxNameAndSlug = async (user: User) => {
  const name = await openAICompletion(user.emailAddresses[0]?.emailAddress ?? "");
  if (!isValidMailboxName(name)) {
    return generateFallbackMailboxNameAndSlug(user);
  }
  const slug = await generateUniqueMailboxSlug(slugify(name.toLowerCase().replace("'s inbox", "")));
  return { name, slug };
};

const isValidMailboxName = (name: string): boolean => name.toLowerCase().endsWith("'s inbox");

const generateFallbackMailboxNameAndSlug = async (user: User) => ({
  name: user.fullName ?? user.id,
  slug: await generateUniqueMailboxSlug(slugify(user.fullName ?? user.id)),
});

const generateUniqueMailboxSlug = async (slug: string): Promise<string> => {
  while (await mailboxExists(slug)) {
    if (slug.length > 100) {
      throw new Error("Failed to generate a unique mailbox slug");
    }
    slug += randomDigit();
  }
  return slug;
};

const mailboxExists = async (slug: string): Promise<boolean> => {
  const result = await db.select({ id: mailboxes.id }).from(mailboxes).where(eq(mailboxes.slug, slug)).limit(1);
  return result.length > 0;
};

const randomDigit = (): string => Math.floor(Math.random() * 10).toString();

const userPrompt = (emailAddress: string): string => {
  const badUsernames = getBadUsernames().join(", ");
  return `Generate a name for a company in the form of "Name's Inbox". The company has email address "${emailAddress}". Do not use the email domain if it's a generic email provider. Do not include generic names like ${badUsernames}.`;
};

const getBadUsernames = () => ["support", "hi", "hello", "contact", "info", "help", "solutions", "consulting"];

const openAICompletion = async (emailAddress: string): Promise<string> => {
  if (!emailAddress) return "";

  const { text } = await generateText({
    model: openai(GPT_4O_MODEL),
    system: "You are a professional name generator for companies. Generate concise and appropriate names.",
    prompt: userPrompt(emailAddress),
    temperature: 0,
    maxTokens: 10,
    experimental_telemetry: {
      isEnabled: true,
      functionId: "generate-mailbox-name",
      metadata: {
        email: emailAddress,
      },
    },
  });

  return text.replace(/[^a-zA-Z0-9'\s]/g, "").trim();
};
