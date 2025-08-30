import { generateText } from "ai";
import { desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations, faqs, websitePages } from "@/db/schema";
import { cacheFor } from "@/lib/cache";
import { MINI_MODEL } from "./core";
import openai from "./openai";

const SAMPLE_QUESTIONS_PROMPT = `Based on the following knowledge base content, generate 9 diverse and helpful sample questions that users might want to ask. 

Make the questions:
- Practical and actionable
- Varied in topic and complexity
- Natural and conversational
- Relevant to the provided content

For each question, also suggest an appropriate emoji that represents the topic.

Return the response as a JSON array with objects containing "text" and "emoji" fields.

Knowledge base content:
{{CONTENT}}

Recent common topics:
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

  try {
    try {
      const recentFaqs = await db
        .select({ content: faqs.content })
        .from(faqs)
        .where(eq(faqs.enabled, true))
        .limit(10);

      const websiteTitles = await db
        .select({ title: websitePages.pageTitle })
        .from(websitePages)
        .where(isNull(websitePages.deletedAt))
        .limit(20);

      const recentSubjects = await db
        .select({ 
          subject: sql<string>`COALESCE(conversations.subject, 'General inquiry')`.as('subject'),
          count: sql<number>`count(*)`.as('count')
        })
        .from(conversationMessages)
        .innerJoin(conversations, eq(conversations.id, conversationMessages.conversationId))
        .where(eq(conversationMessages.role, "user"))
        .groupBy(sql`COALESCE(conversations.subject, 'General inquiry')`)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      const faqContent = recentFaqs.map(f => f.content).join('\n');
      const websiteContent = websiteTitles.map(w => w.title).join('\n');
      const topicContent = recentSubjects.map(s => `${s.subject} (${s.count} times)`).join('\n');

      const content = [faqContent, websiteContent].filter(Boolean).join('\n\n');
      const topics = topicContent || 'General support inquiries';

      const prompt = SAMPLE_QUESTIONS_PROMPT
        .replace('{{CONTENT}}', content)
        .replace('{{TOPICS}}', topics);

      const { text } = await generateText({
        model: openai(MINI_MODEL),
        prompt,
        maxTokens: 1000,
      });

      const questions = JSON.parse(text) as SampleQuestion[];
      
      const filteredQuestions = questions
        .filter(q => q.text && q.emoji && q.text.length > 10)
        .slice(0, 9);

      await cache.set(filteredQuestions, 60 * 15);
      return filteredQuestions;

    } catch (_error) {
      const fallbackQuestions = [
        { text: "How do I get started?", emoji: "🚀" },
        { text: "What are your pricing plans?", emoji: "💰" },
        { text: "How can I contact support?", emoji: "📞" },
        { text: "Is there a mobile app?", emoji: "📱" },
        { text: "How do I reset my password?", emoji: "🔐" },
        { text: "What integrations do you support?", emoji: "🔗" },
      ];
      
      await cache.set(fallbackQuestions, 60 * 15);
      return fallbackQuestions;
    }
  } catch (_cacheError) {
    return [
      { text: "How do I get started?", emoji: "🚀" },
      { text: "What are your pricing plans?", emoji: "💰" },
      { text: "How can I contact support?", emoji: "📞" },
      { text: "Is there a mobile app?", emoji: "📱" },
      { text: "How do I reset my password?", emoji: "🔐" },
      { text: "What integrations do you support?", emoji: "🔗" },
    ];
  }
};
