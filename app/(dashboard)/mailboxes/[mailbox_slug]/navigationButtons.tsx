"use client";

import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { Button } from "@/components/ui/button";

export const NavigationButtons = () => {
  const isStandalone = useMediaQuery({ query: "(display-mode: standalone)" });
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const historyRef = useRef<string[]>([pathname + searchParams.toString()]);
  const historyIndexRef = useRef(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const updateButtonState = () => {
    setCanGoBack(historyIndexRef.current > 0);
    setCanGoForward(historyIndexRef.current < historyRef.current.length - 1);
  };

  useEffect(() => {
    if (historyRef.current[historyIndexRef.current] === pathname + searchParams.toString()) return;

    if (historyRef.current[historyIndexRef.current + 1] === pathname + searchParams.toString()) {
      historyIndexRef.current++;
    } else {
      historyRef.current = [
        ...historyRef.current.slice(0, historyIndexRef.current + 1),
        pathname + searchParams.toString(),
      ];
      historyIndexRef.current++;
    }
    updateButtonState();
  }, [pathname, searchParams]);

  const handleBack = () => {
    if (!canGoBack) return;
    historyIndexRef.current--;
    updateButtonState();
    window.history.back();
  };

  const handleForward = () => {
    if (!canGoForward) return;
    historyIndexRef.current++;
    updateButtonState();
    window.history.forward();
  };

  if (!isStandalone) return null;

  return (
    <div className="flex">
      <Button
        variant="sidebar"
        iconOnly
        onClick={handleBack}
        disabled={!canGoBack}
        className={!canGoBack ? "opacity-50 cursor-not-allowed" : ""}
      >
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <Button
        variant="sidebar"
        iconOnly
        onClick={handleForward}
        disabled={!canGoForward}
        className={!canGoForward ? "opacity-50 cursor-not-allowed" : ""}
      >
        <ArrowRight className="w-4 h-4" />
      </Button>
      <Button variant="sidebar" iconOnly onClick={() => window.location.reload()}>
        <RefreshCw className="w-4 h-4" />
      </Button>
    </div>
  );
};
