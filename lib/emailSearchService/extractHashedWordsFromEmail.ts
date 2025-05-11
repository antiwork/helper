import crypto from "crypto";
import natural from "natural";
import { env } from "@/lib/env";

/**
 * Extract words from email's subject and body. Returns a unique set of hashed words.
 */
export function extractHashedWordsFromEmail(params: {
  emailFrom?: string | null;
  subject?: string | null;
  body?: string | null;
}): string[] {
  const extractedWords: string[] = [];

  if (params.emailFrom) extractedWords.push(params.emailFrom);
  if (params.subject) extractedWords.push(...extractWords(params.subject));
  if (params.body) extractedWords.push(...extractWords(params.body));

  // Stem the words and combine with extracted words
  const stemmedWords = extractedWords.map((word) => natural.PorterStemmer.stem(word));
  extractedWords.push(...extractedWords, ...stemmedWords);

  // Hash all words
  const hashedWords = extractedWords.map((word) => hashWord(word)).filter(Boolean);

  // Create a unique set of hashed words
  return Array.from(new Set(hashedWords));
}

function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter(Boolean);
}

function hashWord(word: string, length = 7): string {
  const fullHash = crypto.createHmac("sha256", env.CRYPTO_SECRET).update(word).digest("base64url");
  return fullHash.slice(0, length);
}
