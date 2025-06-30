/**
 * Creates a search snippet that shows context around matched search terms
 * Uses a simplified approach: find match -> go back 25 chars -> find word break -> add ellipsis
 */
export function createSearchSnippet(text: string, searchTerms: string[], maxLength = 150): string {
  // Input validation for robustness
  if (!text || !searchTerms.length || maxLength <= 0) {
    return text;
  }

  const normalizedText = text.toLowerCase();
  let firstMatchIndex = -1;

  // Find the first match
  for (const term of searchTerms) {
    // Skip empty search terms for better reliability
    if (!term.trim()) continue;
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

  // Find the nearest word break for better context preservation
  let start = contextStart;
  if (contextStart > 0) {
    const wordBreak = text.lastIndexOf(" ", contextStart);
    if (wordBreak !== -1) {
      start = wordBreak + 1;
    }
  }

  // Extract snippet respecting maxLength
  const needsStartEllipsis = start > 0;
  let snippet = text.substring(start);

  // Respect maxLength
  if (needsStartEllipsis) {
    // Handle edge case: if maxLength is too small for ellipsis
    if (maxLength <= 3) {
      snippet = snippet.substring(0, maxLength);
    } else {
      // Reserve 3 chars for start ellipsis
      if (snippet.length > maxLength - 3) {
        snippet = snippet.substring(0, maxLength - 3);
      }
      snippet = `...${snippet}`;
    }
  } else if (snippet.length > maxLength) {
    // No start ellipsis needed, just truncate if necessary
    snippet = snippet.substring(0, maxLength);
  }

  return snippet;
}
