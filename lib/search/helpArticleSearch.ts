export type HelpArticle = {
  title: string;
  url: string;
};

export type SearchResult = HelpArticle & {
  score: number;
};

/**
 * Search help articles with relevance scoring
 * Supports exact matches, partial matches, multi-word queries, and basic fuzzy matching
 */
export function searchHelpArticles(articles: HelpArticle[], query: string, limit = 10): SearchResult[] {
  if (!query.trim()) {
    // Return all articles when query is empty, sorted by title
    return articles
      .map(article => ({ ...article, score: 1 }))
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, limit);
  }
  
  const searchQuery = query.toLowerCase().trim();
  const searchTerms = searchQuery.split(/\s+/).filter(Boolean);
  
  return articles
    .map((article) => {
      const titleLower = article.title.toLowerCase();
      const urlLower = article.url.toLowerCase();
      let score = 0;
      
      // Exact matches get highest priority
      if (titleLower.includes(searchQuery)) {
        score += 100;
      }
      
      // URL matches get medium priority
      if (urlLower.includes(searchQuery)) {
        score += 50;
      }
      
      // Title starts with query gets bonus points
      if (titleLower.startsWith(searchQuery)) {
        score += 30;
      }
      
      // Individual word matches
      searchTerms.forEach((term) => {
        if (titleLower.includes(term)) {
          score += 20;
        }
        if (urlLower.includes(term)) {
          score += 10;
        }
        
        // Simple fuzzy matching for common typos
        const titleWords = titleLower.split(/\s+/);
        titleWords.forEach(titleWord => {
          if (isFuzzyMatch(term, titleWord)) {
            score += 15;
          }
        });
      });
      
      return { ...article, score: score / 100 }; // Normalize to 0-1+ range
    })
    .filter((article) => article.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Simple fuzzy matching for common typos and variations
 */
function isFuzzyMatch(query: string, target: string): boolean {
  if (query.length < 3 || target.length < 3) return false;
  
  // Check for common patterns:
  // - Missing/extra characters: "accont" -> "account"
  // - Swapped characters: "payment" -> "payemnt"
  // - Similar length with high character overlap
  
  const minLength = Math.min(query.length, target.length);
  const maxLength = Math.max(query.length, target.length);
  
  // If length difference is too large, not a fuzzy match
  if (maxLength - minLength > 2) return false;
  
  let matches = 0;
  const queryChars = query.split('');
  const targetChars = target.split('');
  
  // Count character overlaps
  for (let i = 0; i < queryChars.length; i++) {
    const char = queryChars[i];
    if (char && targetChars.includes(char)) {
      matches++;
    }
  }
  
  // If 80%+ characters match, consider it a fuzzy match
  return matches / query.length >= 0.8;
}