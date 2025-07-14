import { create } from "zustand";

interface DraftData {
  content: string;
  timestamp: number;
  conversationSlug?: string | null;
}

export const useScreenshotStore = create<{
  screenshot: { response: string | null } | null;
  setScreenshot: (screenshot: { response: string | null } | null) => void;
  isCapturingScreenshot: boolean;
  screenshotError: string | null;
  setIsCapturingScreenshot: (isCapturing: boolean) => void;
  setScreenshotError: (error: string | null) => void;
}>((set) => ({
  screenshot: null,
  setScreenshot: (screenshot) => set({ screenshot }),
  isCapturingScreenshot: false,
  screenshotError: null,
  setIsCapturingScreenshot: (isCapturingScreenshot) => set({ isCapturingScreenshot }),
  setScreenshotError: (screenshotError) => set({ screenshotError }),
}));

export const useDraftStore = create<{
  draft: DraftData | null;
  isDraftSaved: boolean;
  setDraft: (draft: DraftData | null) => void;
  setIsDraftSaved: (isSaved: boolean) => void;
  saveDraftToStorage: (content: string, conversationSlug?: string | null) => void;
  loadDraftFromStorage: (conversationSlug?: string | null) => DraftData | null;
  clearDraft: (conversationSlug?: string | null) => void;
}>((set, get) => ({
  draft: null,
  isDraftSaved: false,
  setDraft: (draft) => set({ draft }),
  setIsDraftSaved: (isDraftSaved) => set({ isDraftSaved }),
  saveDraftToStorage: (content: string, conversationSlug?: string | null) => {
    if (!content.trim()) {
      get().clearDraft(conversationSlug);
      return;
    }

    const draftData: DraftData = {
      content,
      timestamp: Date.now(),
      conversationSlug,
    };

    const storageKey = `helper_widget_draft_${conversationSlug || "new"}`;
    localStorage.setItem(storageKey, JSON.stringify(draftData));
    set({ draft: draftData, isDraftSaved: true });

    // Clear the saved indicator after 2 seconds
    setTimeout(() => set({ isDraftSaved: false }), 2000);
  },
  loadDraftFromStorage: (conversationSlug?: string | null) => {
    const storageKey = `helper_widget_draft_${conversationSlug || "new"}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const draftData: DraftData = JSON.parse(stored);
        // Only load drafts that are less than 7 days old
        if (Date.now() - draftData.timestamp < 7 * 24 * 60 * 60 * 1000) {
          set({ draft: draftData });
          return draftData;
        }
        // Remove old draft
        localStorage.removeItem(storageKey);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("Failed to parse draft from storage:", error);
        localStorage.removeItem(storageKey);
      }
    }
    return null;
  },
  clearDraft: (conversationSlug?: string | null) => {
    const storageKey = `helper_widget_draft_${conversationSlug || "new"}`;
    localStorage.removeItem(storageKey);
    set({ draft: null, isDraftSaved: false });
  },
}));
