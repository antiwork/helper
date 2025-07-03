export function createSearchSnippet(text: string, searchTerms: string[]): string {
  if (!text || !searchTerms.length) {
    return text;
  }

  const normalizedText = text.toLowerCase();

  let firstMatchIndex = -1;
  for (const term of searchTerms) {
    if (!term.trim()) continue;

    const index = normalizedText.indexOf(term.toLowerCase());

    if (index !== -1 && (firstMatchIndex === -1 || index < firstMatchIndex)) {
      firstMatchIndex = index;
    }
  }

  if (firstMatchIndex === -1) {
    return text;
  }

  const contextStart = Math.max(0, firstMatchIndex - 25);

  let start = contextStart;
  if (contextStart > 0) {
    const wordBreak = text.lastIndexOf(" ", contextStart);
    if (wordBreak !== -1) {
      start = wordBreak + 1;
    }
  }

  const snippet = start > 0 ? `...${text.substring(start)}` : text.substring(start);

  return snippet;
}
