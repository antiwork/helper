import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { type DraftedEmail } from "@/app/types/global";

export const useUndoneEmailStore = create<{
  undoneEmail: DraftedEmail | undefined;
  setUndoneEmail: (undoneEmail: DraftedEmail | undefined) => void;
}>()(
  devtools(
    (set) => ({
      undoneEmail: undefined,
      setUndoneEmail: (undoneEmail) => set({ undoneEmail }),
    }),
    {
      name: "undone-email-store",
    },
  ),
);
