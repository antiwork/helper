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

  // Match is deep in text, create snippet centered around it
  // Reserve space for ellipses (3 chars each for start/end)
  const ellipsesLength = 6; // "..." at start + "..." at end
  const availableLength = maxLength - ellipsesLength;

  let start: number;
  let end: number;

  // If match is longer than available space, truncate to show beginning of match
  if (matchLength >= availableLength) {
    start = firstMatchIndex;
    end = firstMatchIndex + availableLength;
  } else {
    const contextBefore = Math.floor((availableLength - matchLength) / 2);
    const contextAfter = availableLength - matchLength - contextBefore;

    start = Math.max(0, firstMatchIndex - contextBefore);
    end = Math.min(text.length, firstMatchIndex + matchLength + contextAfter);
  }

  // Adjust to word boundaries if possible, staying within available length
  if (start > 0) {
    const wordStart = text.lastIndexOf(" ", start);
    if (wordStart !== -1) {
      const newStart = wordStart + 1;
      if (end - newStart <= availableLength) {
        start = newStart;
      }
    }
  }

  if (end < text.length) {
    const wordEnd = text.indexOf(" ", end);
    if (wordEnd !== -1) {
      const newEnd = wordEnd;
      if (newEnd - start <= availableLength) {
        end = newEnd;
      }
    }
  }

  let snippet = text.substring(start, end);
  if (start > 0) snippet = `...${snippet}`;
  if (end < text.length) snippet += "...";

  return snippet;
}
