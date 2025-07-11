/**
 * Strips HTML tags from a string and returns plain text
 * @param html The HTML string to strip tags from
 * @returns Plain text with HTML tags removed
 */
export function stripHtmlTags(html: string): string {
  if (!html) return "";

  // DOM-based approach for accurate HTML parsing (client-side only)
  if (typeof window !== "undefined" && window.DOMParser) {
    try {
      // Use DOMParser in browser environment
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      return extractTextFromDocument(doc);
    } catch {
      // Fall back to regex if DOMParser fails
      return stripHtmlTagsRegex(html);
    }
  }

  // Server-side or environments without DOMParser - use improved regex fallback
  return stripHtmlTagsRegex(html);
}

/**
 * Extracts text content from a DOM document with proper formatting
 * @param document DOM document to extract text from
 * @returns Clean text content
 */
function extractTextFromDocument(document: Document): string {
  // Remove script and style elements entirely
  const scripts = document.querySelectorAll("script, style");
  scripts.forEach((el) => el.remove());

  // Replace br tags with newlines before extracting text
  const brElements = document.querySelectorAll("br");
  brElements.forEach((br) => {
    br.replaceWith(document.createTextNode("\n"));
  });

  // Replace block elements with newlines to preserve structure
  const blockElements = document.querySelectorAll("div, p, h1, h2, h3, h4, h5, h6, li, blockquote");
  blockElements.forEach((el) => {
    // Add newline after block elements
    if (el.nextSibling) {
      el.parentNode?.insertBefore(document.createTextNode("\n"), el.nextSibling);
    }
  });

  // Extract text content (automatically decodes all HTML entities)
  const textContent = document.body ? document.body.textContent : document.textContent;

  // Clean up multiple newlines and whitespace
  return (textContent || "")
    .replace(/\n\s*\n/g, "\n") // Replace multiple newlines with single newline
    .replace(/[ \t]+/g, " ") // Replace multiple spaces/tabs with single space
    .trim();
}

/**
 * Fallback regex-based HTML tag stripping (less accurate but works everywhere)
 * @param html HTML string to process
 * @returns Text with tags removed using regex
 */
function stripHtmlTagsRegex(html: string): string {
  return (
    html
      // Remove script and style content entirely
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      // Replace br tags with newlines
      .replace(/<br\s*\/?>/gi, "\n")
      // Replace block elements with newlines
      .replace(/<\/(div|p|h[1-6]|li|blockquote)>/gi, "\n")
      // Remove all remaining HTML tags
      .replace(/<[^>]*>/g, "")
      // Decode common HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&cent;/g, "¢")
      .replace(/&pound;/g, "£")
      .replace(/&yen;/g, "¥")
      .replace(/&euro;/g, "€")
      .replace(/&copy;/g, "©")
      .replace(/&reg;/g, "®")
      // Clean up whitespace
      .replace(/\n\s*\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim()
  );
}

/**
 * Truncates text to a specified length with ellipsis
 * @param text The text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}
