import { useResponsive } from "./useResponsive";

export function useIsMobile() {
  const { isMobile } = useResponsive();
  return isMobile;
}
