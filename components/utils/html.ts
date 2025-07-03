/**
 * Strips HTML tags from a string and returns plain text
 * @param html The HTML string to strip tags from
 * @returns Plain text with HTML tags removed
 */
export function stripHtmlTags(html: string): string {
  if (!html) return "";

  // Remove HTML tags using regex
  return html
    .replace(/<[^>]*>/g, "") // Remove all HTML tags
    .replace(/&nbsp;/g, " ") // Replace non-breaking spaces
    .replace(/&amp;/g, "&") // Replace HTML entities
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim(); // Remove leading/trailing whitespace
}

/**
 * Truncates text to a specified length with ellipsis
 * @param text The text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}
