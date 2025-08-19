import crypto from "crypto";
import natural from "natural";
import { getOrCreateSecret, SECRET_NAMES } from "@/lib/secrets";

/**
 * Extract words from email's subject and body. Returns a unique set of hashed words.
 */
export async function extractHashedWordsFromEmail(params: {
  emailFrom?: string | null;
  subject?: string | null;
  body?: string | null;
}): Promise<string[]> {
  const extractedWords: string[] = [];

  if (params.emailFrom) extractedWords.push(params.emailFrom);
  if (params.subject) extractedWords.push(...extractWords(params.subject));
  if (params.body) extractedWords.push(...extractWords(params.body));

  // Stem the words and combine with extracted words
  const stemmedWords = extractedWords.map((word) => natural.PorterStemmer.stem(word));
  extractedWords.push(...extractedWords, ...stemmedWords);

  // Get the secret once
  const secret = await getOrCreateSecret(SECRET_NAMES.HASH_WORDS);

  // Hash all words
  const hashedWords = extractedWords.map((word) => hashWord(word, secret)).filter(Boolean);

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

function hashWord(word: string, secret: string, length = 7): string {
  const fullHash = crypto.createHmac("sha256", secret).update(word).digest("base64url");
  return fullHash.slice(0, length);
}
