import Fuse from 'fuse.js';

export type HelpArticle = {
  title: string;
  url: string;
};

export type SearchResult = HelpArticle & {
  score: number;
};

/**
 * Search help articles using Fuse.js for fuzzy searching
 * Provides better fuzzy matching, typo tolerance, and relevance scoring
 */
export function searchHelpArticles(articles: HelpArticle[], query: string, limit = 10): SearchResult[] {
  const trimmedQuery = query.trim();
  
  if (!trimmedQuery) {
    // Return all articles when query is empty, sorted by title
    return articles
      .map(article => ({ ...article, score: 1 }))
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, limit);
  }

  const fuse = new Fuse(articles, {
    keys: [
      {
        name: 'title',
        weight: 0.8, // Title matches are more important
      },
      {
        name: 'url',
        weight: 0.2, // URL matches are less important
      },
    ],
    threshold: 0.6, // Lower = more strict, higher = more fuzzy
    distance: 100, // Maximum distance for character matching
    minMatchCharLength: 1, // Minimum character length to be considered a match
    includeScore: true, // Include the search score in results
    ignoreLocation: true, // Don't consider where in the string the match occurs
    shouldSort: true, // Sort results by score
  });

  const fuseResults = fuse.search(trimmedQuery, { limit });
  
  return fuseResults.map((result) => ({
    ...result.item,
    score: 1 - (result.score || 0), // Fuse.js uses lower scores for better matches, so invert
  }));
}
