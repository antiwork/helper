/**
 * Safely extract message content, handling edge cases like quotes
 */
export const extractMessageContent = (message: string | null | undefined): string => {
  if (!message) return "";

  const trimmed = message.trim();

  // If the message is wrapped in quotes, remove them
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};
