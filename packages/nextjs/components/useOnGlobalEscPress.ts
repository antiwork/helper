import { useGlobalEventListener } from "@/components/useGlobalEventListener";

export const useOnGlobalEscPress = (cb: () => void) => {
  useGlobalEventListener("keydown", (evt) => {
    if (evt.key === "Escape") {
      cb();
    }
  });
};
