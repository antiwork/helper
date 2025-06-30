/**
 * Creates a search snippet that shows context around matched search terms
 * Uses a simplified approach: find match -> go back 25 chars -> find word break -> add ellipsis
 */
export function createSearchSnippet(text: string, searchTerms: string[], maxLength = 150): string {
  if (!text || !searchTerms.length) {
    return text;
  }

  const normalizedText = text.toLowerCase();
  let firstMatchIndex = -1;

  // Find the first match
  for (const term of searchTerms) {
    const index = normalizedText.indexOf(term.toLowerCase());
    if (index !== -1 && (firstMatchIndex === -1 || index < firstMatchIndex)) {
      firstMatchIndex = index;
    }
  }

  // If no match found, return original text
  if (firstMatchIndex === -1) {
    return text;
  }

  // Go back 25 characters from the match
  const contextStart = Math.max(0, firstMatchIndex - 25);
  
  // Find the nearest word break
  let start = contextStart;
  if (contextStart > 0) {
    const wordBreak = text.indexOf(' ', contextStart);
    if (wordBreak !== -1 && wordBreak < firstMatchIndex) {
      start = wordBreak + 1;
    }
  }

  // Add start ellipsis if we're not at the beginning
  const needsStartEllipsis = start > 0;
  let snippet = text.substring(start);
  
  if (needsStartEllipsis) {
    snippet = '...' + snippet;
  }

  return snippet;
}
