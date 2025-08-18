import { ExternalLink, Search, X } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { useBreakpoint } from "@/components/useBreakpoint";
import { useOnOutsideClick } from "@/components/useOnOutsideClick";
import { searchHelpArticles } from "@/lib/search/helpArticleSearch";

type HelpArticle = {
  title: string;
  url: string;
};

type HelpArticleMentionPopoverProps = {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  query: string;
  articles: HelpArticle[];
  selectedIndex: number;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  onSelect: (article: HelpArticle) => void;
  onClose: () => void;
};

const HelpArticleMentionPopover: React.FC<HelpArticleMentionPopoverProps> = ({
  isOpen,
  position,
  query,
  articles,
  selectedIndex,
  setSelectedIndex,
  onSelect,
  onClose,
}) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  useOnOutsideClick([ref], () => isOpen && onClose());
  const { isBelowMd: isMobile } = useBreakpoint("md");

  const [mobileQuery, setMobileQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => {
    if (isMobile && isOpen) {
      setMobileQuery("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isMobile, isOpen]);

  const filterQuery = isMobile ? mobileQuery : query;
  const filtered = searchHelpArticles(articles, filterQuery, 10);

  if (!isOpen || (!position && !isMobile)) return null;

  let popoverStyle: React.CSSProperties = {};
  let popoverTop = position?.top ?? 80;
  let popoverLeft = position?.left ?? 40;
  let maxHeight = 320;
  if (!isMobile && typeof window !== "undefined") {
    const margin = 8;
    const availableBelow = window.innerHeight - popoverTop - margin;
    if (availableBelow < maxHeight) {
      maxHeight = Math.max(120, availableBelow);
      if (maxHeight < 160 && popoverTop > maxHeight + margin) {
        popoverTop = window.innerHeight - maxHeight - margin;
      }
    }
    if (!position) {
      popoverTop = window.innerHeight - maxHeight - margin;
      popoverLeft = window.innerWidth / 2 - 160;
    }
    popoverStyle = {
      position: "absolute",
      top: popoverTop,
      left: popoverLeft,
      zIndex: 9999,
      minWidth: 320,
      maxHeight,
      overflowY: "auto",
    };
  }

  const renderList = (listClass: string, itemClass: string) => (
    <ul className={listClass}>
      {filtered.map((a, i) => (
        <li
          key={a.url}
          className={`${itemClass} ${i === selectedIndex ? "bg-accent text-accent-foreground" : ""}`}
          onMouseEnter={() => setSelectedIndex(i)}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(a);
          }}
        >
          <div className="flex-1 min-w-0">
            <span className="font-medium">{a.title}</span>
            <span className="block text-xs text-muted-foreground truncate">{a.url}</span>
          </div>
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 flex-shrink-0 text-muted-foreground hover:text-primary"
            tabIndex={-1}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={16} />
          </a>
        </li>
      ))}
    </ul>
  );

  const popover = isMobile ? (
    <div ref={ref} className="fixed inset-0 w-full h-full bg-background z-[9999] flex flex-col" style={{}}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search help center articles..."
          value={mobileQuery}
          onChange={(e) => setMobileQuery(e.target.value)}
          className="h-10 flex-1"
        />
        <button
          type="button"
          onClick={onClose}
          className="ml-2 p-2 text-muted-foreground hover:text-primary"
          aria-label="Close"
        >
          <X size={22} />
        </button>
      </div>
      {filtered.length === 0 ? (
        <div className="text-sm p-4">No articles found</div>
      ) : (
        renderList(
          "flex-1 overflow-y-auto px-2 pb-4",
          "flex items-center justify-between cursor-pointer px-2 py-2 rounded hover:bg-accent",
        )
      )}
    </div>
  ) : (
    <div ref={ref} style={popoverStyle} className="rounded border border-border bg-background shadow-lg p-2 pt-3 pb-3">
      <div className="flex items-center text-xs text-muted-foreground mb-2 px-2">
        <Search size={14} className="mr-2" />
        <span>Search help center articles</span>
      </div>
      {filtered.length === 0 ? (
        <div className="text-sm p-2">No articles found</div>
      ) : (
        renderList("", "flex items-center justify-between cursor-pointer px-2 py-1 rounded hover:bg-accent")
      )}
    </div>
  );
  return createPortal(popover, document.body);
};

export default HelpArticleMentionPopover;
