import { create } from "zustand";

type ScreenshotState =
  | { state: "initial" }
  | { state: "capturing" }
  | { state: "captured"; response: string }
  | { state: "error"; error: string };

export const useScreenshotStore = create<{
  screenshotState: ScreenshotState;
  setScreenshotState: (state: ScreenshotState) => void;
  screenshot: { response: string | null } | null;
  setScreenshot: (screenshot: { response: string | null } | null) => void;
}>((set) => ({
  screenshotState: { state: "initial" },
  setScreenshotState: (screenshotState) => set({ screenshotState }),
  screenshot: null,
  setScreenshot: (screenshot) => set({ screenshot }),
}));
