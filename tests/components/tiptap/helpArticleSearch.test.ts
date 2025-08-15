import { describe, expect, it } from "vitest";
import { searchHelpArticles, type HelpArticle } from "@/lib/search/helpArticleSearch";

// Use the actual search function from the new location
const searchArticles = (articles: HelpArticle[], query: string) => {
  return searchHelpArticles(articles, query, 10);
};

describe("Help Article Search", () => {
  const mockArticles: HelpArticle[] = [
    {
      title: "Account login security",
      url: "https://gumroad.com/help/article/292-account-login-security",
    },
    {
      title: "Account settings",
      url: "https://gumroad.com/help/article/67-the-settings-menu",
    },
    {
      title: "Adding a product",
      url: "https://gumroad.com/help/article/149-adding-a-product",
    },
    {
      title: "Payout methods",
      url: "https://gumroad.com/help/article/180-payout-methods",
    },
    {
      title: "Payment processing",
      url: "https://gumroad.com/help/article/201-payment-processing",
    },
    {
      title: "Getting paid and payouts",
      url: "https://gumroad.com/help/article/150-getting-paid",
    },
    {
      title: "Account suspension FAQ",
      url: "https://gumroad.com/help/article/160-suspension",
    },
    {
      title: "Accessibility statement for Gumroad",
      url: "https://gumroad.com/help/article/324-accessibility-statement",
    },
  ];

  describe("Basic search functionality", () => {
    it("returns all articles when query is empty", () => {
      const results = searchArticles(mockArticles, "");
      expect(results).toHaveLength(mockArticles.length);
      // Results should be sorted alphabetically by title
      expect(results[0]?.title).toBe("Accessibility statement for Gumroad");
    });

    it("returns all articles when query is only whitespace", () => {
      const results = searchArticles(mockArticles, "   ");
      expect(results).toHaveLength(mockArticles.length);
      // Results should be sorted alphabetically by title
      expect(results[0]?.title).toBe("Accessibility statement for Gumroad");
    });

    it("returns empty array when no articles match", () => {
      const results = searchArticles(mockArticles, "nonexistent");
      expect(results).toEqual([]);
    });
  });

  describe("Exact title matching", () => {
    it("finds articles with exact title match", () => {
      const results = searchArticles(mockArticles, "account login");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.title).toBe("Account login security");
    });

    it("finds articles with partial title match", () => {
      const results = searchArticles(mockArticles, "payout");
      const titles = results.map((r) => r.title);
      expect(titles).toContain("Payout methods");
      expect(titles).toContain("Getting paid and payouts");
    });
  });

  describe("URL matching", () => {
    it("finds articles by URL content", () => {
      const results = searchArticles(mockArticles, "suspension");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.url.includes("suspension"))).toBe(true);
    });

    it("finds articles by URL slug", () => {
      const results = searchArticles(mockArticles, "292");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.url).toContain("292");
    });
  });

  describe("Multi-word search", () => {
    it("handles multi-word queries", () => {
      const results = searchArticles(mockArticles, "account settings");
      expect(results.length).toBeGreaterThan(0);
      // Should find both "Account settings" and "Account login security"
      const titles = results.map((r) => r.title);
      expect(titles).toContain("Account settings");
    });

    it("ranks exact phrase matches higher than individual word matches", () => {
      const results = searchArticles(mockArticles, "account login");
      expect(results[0]?.title).toBe("Account login security");
    });
  });

  describe("Scoring and ranking", () => {
    it("ranks exact title matches highest", () => {
      const results = searchArticles(mockArticles, "payout");
      // "Payout methods" should rank higher than "Getting paid and payouts"
      // because it starts with the search term
      expect(results[0]?.title).toBe("Payout methods");
    });

    it("gives bonus points for titles that start with query", () => {
      const results = searchArticles(mockArticles, "account");
      // Both "Account login security" and "Account settings" start with "account"
      // They should be at the top
      expect(results[0]?.title).toMatch(/^Account/);
      expect(results[1]?.title).toMatch(/^Account/);
    });

    it("considers both title and URL matches", () => {
      const results = searchArticles(mockArticles, "accessibility");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.title).toBe("Accessibility statement for Gumroad");
    });
  });

  describe("Result limiting", () => {
    it("limits results to maximum of 10 items", () => {
      // Create more than 10 articles that would match
      const manyArticles = Array.from({ length: 15 }, (_, i) => ({
        title: `Account article ${i + 1}`,
        url: `https://example.com/help/article/${i + 1}-account`,
      }));

      const results = searchArticles(manyArticles, "account");
      expect(results.length).toBeLessThanOrEqual(10);
    });
  });

  describe("Case insensitive search", () => {
    it("matches regardless of case", () => {
      const results = searchArticles(mockArticles, "ACCOUNT");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.title.toLowerCase().includes("account"))).toBe(true);
    });

    it("handles mixed case queries", () => {
      const results = searchArticles(mockArticles, "Account Login");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.title).toBe("Account login security");
    });
  });

  describe("Edge cases", () => {
    it("handles special characters in query", () => {
      const results = searchArticles(mockArticles, "account-login");
      expect(results.length).toBeGreaterThan(0);
    });

    it("handles empty articles array", () => {
      const results = searchArticles([], "account");
      expect(results).toEqual([]);
    });

    it("trims whitespace from query", () => {
      const results1 = searchArticles(mockArticles, " account ");
      const results2 = searchArticles(mockArticles, "account");
      expect(results1).toEqual(results2);
    });
  });

  describe("Fuzzy matching character counting", () => {
    it("prevents duplicate character matching in fuzzy search", () => {
      // Create a test case where the query has repeated characters
      // and the target has fewer instances of those characters
      const testArticles: HelpArticle[] = [
        {
          title: "account", // single 'c', single 'n', single 't'
          url: "https://example.com/account",
        },
        {
          title: "acccount", // multiple 'c's
          url: "https://example.com/acccount",
        },
      ];

      // Query with repeated characters that exist in target
      const results = searchArticles(testArticles, "accnt");

      // Both should match with fuzzy matching
      expect(results.length).toBeGreaterThan(0);

      // Both articles should be found
      const titles = results.map((r) => r.title);
      expect(titles).toContain("account");
      expect(titles).toContain("acccount");
    });
  });
});
