import { create } from "zustand";

interface NowStore {
  now: Date;
  updateNow: () => void;
}

const useNowStore = create<NowStore>((set) => ({
  now: new Date(),
  updateNow: () => set({ now: new Date() }),
}));

setInterval(() => useNowStore.getState().updateNow(), 60_000);

export const useNow = () => useNowStore((state) => state.now);
