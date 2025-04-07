import { useMediaQuery } from "react-responsive";
import resolveConfig from "tailwindcss/resolveConfig";
import type { Config, ScreensConfig } from "tailwindcss/types/config";
import { assertDefined } from "@/components/utils/assert";
import { env } from "@/env";
import tailwindConfig from "../../tailwind.config";

const fullConfig = resolveConfig(tailwindConfig as unknown as Config);

const breakpoints: ScreensConfig = fullConfig.theme.screens;

/**
 * @usage
 *    import { useBreakpoint } from "@/hooks/useBreakpoint";
 *
 *    const { isAboveSm, isBelowSm, sm } = useBreakpoint("sm");
 *    console.log({ isAboveSm, isBelowSm, sm });
 *
 *    const { isAboveMd } = useBreakpoint("md");
 *    const { isAboveLg } = useBreakpoint("lg");
 *    const { isAbove2Xl } = useBreakpoint("2xl");
 *    console.log({ isAboveMd, isAboveLg, isAbove2Xl });
 *
 * @see https://stackoverflow.com/a/76630444/6543935
 */
export function useBreakpoint<K extends string>(breakpointKey: K) {
  let breakpointValue = breakpoints[breakpointKey as keyof typeof breakpoints];
  if (typeof breakpointValue !== "string") {
    const message = `'useBreakpoint' does not support breakpoints of type ${typeof breakpointValue}`;
    if (env.NODE_ENV === "development") {
      throw new Error(message);
    } else {
      breakpointValue = "1024px";
    }
  }

  const bool = useMediaQuery({
    query: `(max-width: ${breakpointValue})`,
  });
  const capitalizedKey = assertDefined(breakpointKey[0]).toUpperCase() + breakpointKey.substring(1);

  type KeyAbove = `isAbove${Capitalize<K>}`;
  type KeyBelow = `isBelow${Capitalize<K>}`;

  return {
    [breakpointKey]: Number(String(breakpointValue).replace(/[^0-9]/gu, "")),
    [`isAbove${capitalizedKey}`]: !bool,
    [`isBelow${capitalizedKey}`]: bool,
  } as Record<K, number> & Record<KeyAbove | KeyBelow, boolean>;
}
