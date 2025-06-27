/**
 * Creates a smart text snippet that shows context around matched search terms
 * Returns the original text if the match is early enough to be shown with normal truncation
 */
export function createSearchSnippet(
  text: string,
  searchTerms: string[],
  maxLength: number = 150
): string {
  if (!text || !searchTerms.length) {
    return text;
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
  const contextBefore = Math.floor((maxLength - matchLength) / 2);
  const contextAfter = maxLength - matchLength - contextBefore;

  let start = Math.max(0, firstMatchIndex - contextBefore);
  let end = Math.min(text.length, firstMatchIndex + matchLength + contextAfter);


  if (start > 0) {
    const wordStart = text.lastIndexOf(' ', start);
    if (wordStart !== -1) {
      const newStart = wordStart + 1;
      if (end - newStart <= maxLength) {
        start = newStart;
      }
    }
  }

  if (end < text.length) {
    const wordEnd = text.indexOf(' ', end);
    if (wordEnd !== -1) {
      const newEnd = wordEnd;
      if (newEnd - start <= maxLength) {
        end = newEnd;
      }
    }
  }


  let snippet = text.substring(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";

  return snippet;
}