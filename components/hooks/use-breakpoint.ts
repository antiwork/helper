import { useMediaQuery } from "react-responsive";
import defaultTheme from "tailwindcss/defaultTheme";
import { assertDefined } from "@/components/utils/assert";
import { env } from "@/lib/env";

const breakpoints = defaultTheme.screens;

/**
 * Use CSS breakpoints in React. IMPORTANT: This only supports default Tailwind breakpoints, not any custom ones.
 *
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
export function useBreakpoint<K extends keyof typeof breakpoints>(breakpointKey: K) {
  let breakpointValue = breakpoints[breakpointKey];
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
