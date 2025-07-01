import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ScrollToTopButtonProps {
  scrollRef: React.MutableRefObject<HTMLElement | null> & React.RefCallback<HTMLElement>;
}

export const ScrollToTopButton = ({ scrollRef }: ScrollToTopButtonProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        const scrollTop = scrollElement.scrollTop;
        const threshold = 100;

        // Show button whenever scrolled past threshold
        setShow(scrollTop > threshold);
      }, 100);
    };

    scrollElement.addEventListener("scroll", handleScroll);
    return () => {
      scrollElement.removeEventListener("scroll", handleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [scrollRef]);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          className={cn(
            "absolute bottom-4 left-4 transition-all duration-200 h-8 w-8 p-0 rounded-full",
            "flex items-center justify-center",
            "bg-background border border-border shadow-xs",
            "hover:border-primary hover:shadow-md hover:bg-muted",
            show ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none",
          )}
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-4 w-4 text-foreground" />
        </a>
      </TooltipTrigger>
      <TooltipContent>Scroll to top</TooltipContent>
    </Tooltip>
  );
};