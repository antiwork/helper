/**
 * Creates a search snippet by finding the first search term match in text
 * and returning a context window around it for display in search results
 */
export function createSearchSnippet(text: string, searchTerms: string[]): string {
  // Early return for invalid input - no text or search terms
  if (!text || !searchTerms.length) {
    return text;
  }

  
  const normalizedText = text.toLowerCase();

  // Find the earliest match position among all search terms
  let firstMatchIndex = -1;
  for (const term of searchTerms) {
    if (!term.trim()) continue;
    
    const index = normalizedText.indexOf(term.toLowerCase());
    // Keep track of the earliest match position
    if (index !== -1 && (firstMatchIndex === -1 || index < firstMatchIndex)) {
      firstMatchIndex = index;
    }
  }

  // No matches found - return original text
  if (firstMatchIndex === -1) {
    return text;
  }

  // Calculate snippet start position (25 characters before the match for context)
  const contextStart = Math.max(0, firstMatchIndex - 25);

  // Try to start at a word boundary to avoid cutting words in half
  let start = contextStart;
  if (contextStart > 0) {
    // Look backwards for the nearest space to start at a word boundary
    const wordBreak = text.lastIndexOf(" ", contextStart);
    if (wordBreak !== -1) {
      start = wordBreak + 1; // Start after the space
    }
  }

  // Create the snippet, adding "..." prefix if we're starting mid-text
  const snippet = start > 0 ? `...${text.substring(start)}` : text.substring(start);

  return snippet;
}
