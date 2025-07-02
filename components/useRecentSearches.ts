import { useCallback, useEffect, useState } from "react";

interface RecentSearch {
  id: number;
  searchTerm: string;
  timestamp: number;
}

export const useRecentSearches = (mailboxSlug: string) => {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const storageKey = `recent-searches-${mailboxSlug}`;

  const loadRecentSearches = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const searches = JSON.parse(stored) as RecentSearch[];
        setRecentSearches(searches.sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch (error) {
      console.warn("Failed to load recent searches:", error);
      setRecentSearches([]);
    }
  }, [storageKey]);

  const saveRecentSearch = useCallback(
    (searchTerm: string) => {
      if (!searchTerm.trim()) return;

      setRecentSearches((prev) => {
        const filtered = prev.filter((search) => search.searchTerm !== searchTerm.trim());
        const newSearch: RecentSearch = {
          id: Date.now(),
          searchTerm: searchTerm.trim(),
          timestamp: Date.now(),
        };
        const updated = [newSearch, ...filtered].slice(0, 5);

        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (error) {
          console.warn("Failed to save recent search:", error);
        }

        return updated;
      });
    },
    [storageKey],
  );

  const deleteRecentSearch = useCallback(
    (searchId: number) => {
      setRecentSearches((prev) => {
        const updated = prev.filter((search) => search.id !== searchId);

        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (error) {
          console.warn("Failed to delete recent search:", error);
        }

        return updated;
      });
    },
    [storageKey],
  );

  useEffect(() => {
    loadRecentSearches();
  }, [loadRecentSearches]);

  return {
    recentSearches,
    saveRecentSearch,
    deleteRecentSearch,
  };
};
