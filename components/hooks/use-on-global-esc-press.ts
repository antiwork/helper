import { useGlobalEventListener } from "@/components/hooks/use-global-event-listener";

export const useOnGlobalEscPress = (cb: () => void) => {
  useGlobalEventListener("keydown", (evt) => {
    if (evt.key === "Escape") {
      cb();
    }
  });
};
