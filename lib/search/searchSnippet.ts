/**
 * Creates a smart text snippet that shows context around matched search terms
 * Returns the original text if the match is early enough to be shown with normal truncation
 */
export function createSearchSnippet(text: string, searchTerms: string[], maxLength = 150): string {
  if (!text || !searchTerms.length) {
    return text;
  }

  if (maxLength <= 0) {
    throw new Error("maxLength must be positive");
  }

  const normalizedText = text.toLowerCase();
  let firstMatchIndex = -1;
  let matchLength = 0;

  for (const term of searchTerms) {
    const index = normalizedText.indexOf(term.toLowerCase());
    if (index !== -1 && (firstMatchIndex === -1 || index < firstMatchIndex)) {
      firstMatchIndex = index;
      matchLength = term.length;
    }
  }

  // If no match found, return original text
  if (firstMatchIndex === -1) {
    return text;
  }

  // If match is early enough that normal truncation would show it, return original
  if (firstMatchIndex + matchLength <= maxLength) {
    return text;
  }

  // Handle edge case: if maxLength is too small, just return truncated text
  if (maxLength <= 6) {
    return text.substring(0, maxLength);
  }

  // Calculate snippet boundaries without pre-reserving ellipses space
  let start: number;
  let end: number;

  // If match is very long, prioritize showing the beginning of the match
  if (matchLength > maxLength - 6) {
    start = firstMatchIndex;
    end = Math.min(text.length, firstMatchIndex + maxLength - 6);
  } else {
    // Calculate context with generous space (we'll adjust for ellipses later)
    const contextBefore = Math.floor((maxLength - matchLength) / 2);
    const contextAfter = maxLength - matchLength - contextBefore;

    start = Math.max(0, firstMatchIndex - contextBefore);
    end = Math.min(text.length, firstMatchIndex + matchLength + contextAfter);
  }

  // Adjust to word boundaries if possible
  if (start > 0) {
    const wordStart = text.lastIndexOf(" ", start);
    if (wordStart !== -1 && wordStart >= firstMatchIndex - Math.floor(maxLength / 2)) {
      start = wordStart + 1;
    }
  }

  if (end < text.length) {
    const wordEnd = text.indexOf(" ", end);
    if (wordEnd !== -1 && wordEnd <= firstMatchIndex + matchLength + Math.floor(maxLength / 2)) {
      end = wordEnd;
    }
  }

  // Extract base snippet
  let snippet = text.substring(start, end);

  // Add ellipses and ensure total length doesn't exceed maxLength
  const needsStartEllipsis = start > 0;
  const needsEndEllipsis = end < text.length;

  if (needsStartEllipsis && needsEndEllipsis) {
    // Need both ellipses (6 chars total)
    if (snippet.length > maxLength - 6) {
      snippet = snippet.substring(0, maxLength - 6);
    }
    snippet = `...${snippet}...`;
  } else if (needsStartEllipsis) {
    // Need only start ellipsis (3 chars)
    if (snippet.length > maxLength - 3) {
      snippet = snippet.substring(0, maxLength - 3);
    }
    snippet = `...${snippet}`;
  } else if (needsEndEllipsis) {
    // Need only end ellipsis (3 chars)
    if (snippet.length > maxLength - 3) {
      snippet = snippet.substring(0, maxLength - 3);
    }
    snippet = `${snippet}...`;
  } else if (snippet.length > maxLength) {
    // No ellipses needed, just truncate if necessary
    snippet = snippet.substring(0, maxLength);
  }

  return snippet;
}
