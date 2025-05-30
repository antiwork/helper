"use client";

import { useEffect, useState } from "react";

type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl";

const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

export function useBreakpoint(breakpoint: Breakpoint) {
  const [isAbove, setIsAbove] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      setIsAbove(window.innerWidth >= breakpoints[breakpoint]);
    };

    checkSize();
    window.addEventListener("resize", checkSize);

    return () => window.removeEventListener("resize", checkSize);
  }, [breakpoint]);

  return {
    [`isAbove${breakpoint.charAt(0).toUpperCase() + breakpoint.slice(1)}`]: isAbove,
  };
}
