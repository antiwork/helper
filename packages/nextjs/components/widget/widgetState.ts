import { create } from "zustand";

export const useScreenshotStore = create<{
  screenshot: { response: string | null } | null;
  setScreenshot: (screenshot: { response: string | null } | null) => void;
}>((set) => ({
  screenshot: null,
  setScreenshot: (screenshot) => set({ screenshot }),
}));
