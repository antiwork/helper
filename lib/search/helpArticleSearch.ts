import Fuse from "fuse.js";

export type HelpArticle = {
  title: string;
  url: string;
};

export type SearchResult = HelpArticle;

export function searchHelpArticles(articles: HelpArticle[], query: string, limit = 10): SearchResult[] {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [...articles].sort((a, b) => a.title.localeCompare(b.title)).slice(0, limit);
  }

  const fuse = new Fuse<HelpArticle>(articles, {
    keys: [
      {
        name: "title",
        weight: 0.8,
      },
      {
        name: "url",
        weight: 0.2,
      },
    ],
    threshold: 0.6,
    distance: 100,
    minMatchCharLength: 1,
    ignoreLocation: true,
    includeScore: false,
    shouldSort: true,
  });

  const fuseResults = fuse.search(trimmedQuery, { limit });

  return fuseResults.map((result) => result.item);
}
