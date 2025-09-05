import { desc, eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversations, faqs, websitePages } from "@/db/schema";
import { cacheFor } from "@/lib/cache";
import { generateStructuredObject, MINI_MODEL } from "./core";

const SAMPLE_QUESTIONS_PROMPT = `Based on the following knowledge base content, generate 9 diverse and helpful sample questions that users might want to ask. 

Make the questions:
- Succinct, one *short* sentence each
- Practical and actionable
- Varied in topic and complexity
- Natural and conversational
- Relevant to the provided content

For each question, also suggest an appropriate emoji that represents the topic.

Return the response as a JSON object with a "questions" array, containing objects with "text" and "emoji" fields.

Knowledge base content:
{{CONTENT}}

Recent conversation subjects:
{{TOPICS}}`;

interface SampleQuestion {
  text: string;
  emoji: string;
}

export const generateSampleQuestions = async (): Promise<SampleQuestion[]> => {
  const cache = cacheFor<SampleQuestion[]>("sample-questions");

  const cached = await cache.get();
  if (cached) {
    return cached;
  }

  const recentFaqs = await db.select({ content: faqs.content }).from(faqs).where(eq(faqs.enabled, true)).limit(10);

  const websiteTitles = await db
    .select({ title: websitePages.pageTitle })
    .from(websitePages)
    .where(isNull(websitePages.deletedAt))
    .limit(20);

  const recentSubjects = await db
    .select({ subject: conversations.subject })
    .from(conversations)
    .where(isNotNull(conversations.subject))
    .orderBy(desc(conversations.createdAt))
    .limit(100);

  const faqContent = recentFaqs.map((f) => f.content).join("\n");
  const websiteContent = websiteTitles.map((w) => w.title).join("\n");
  const topicContent = recentSubjects.map((s) => `${s.subject}`).join("\n");

  const content = [faqContent, websiteContent].filter(Boolean).join("\n\n");
  const topics = topicContent || "General support inquiries";

  const prompt = SAMPLE_QUESTIONS_PROMPT.replace("{{CONTENT}}", content).replace("{{TOPICS}}", topics);

  const {
    object: { questions },
  } = await generateStructuredObject({
    model: MINI_MODEL,
    prompt,
    schema: z.object({ questions: z.array(z.object({ text: z.string(), emoji: z.string() })) }),
  });

  const filteredQuestions = questions.filter((q) => q.text && q.emoji && q.text.length > 10).slice(0, 9);

  await cache.set(filteredQuestions, 60 * 15);
  return filteredQuestions;
};
