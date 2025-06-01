import React from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Search, X } from "lucide-react";
import { useOnOutsideClick } from "@/components/useOnOutsideClick";
import { Input } from "@/components/ui/input";

export type HelpArticle = {
  title: string;
  url: string;
};

type HelpArticleMentionPopoverProps = {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  query: string;
  articles: HelpArticle[];
  onSelect: (article: HelpArticle) => void;
  onClose: () => void;
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
};

const HelpArticleMentionPopover: React.FC<HelpArticleMentionPopoverProps> = ({
  isOpen,
  position,
  query,
  articles,
  onSelect,
  onClose,
}) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  useOnOutsideClick([ref], () => isOpen && onClose());
  const isMobile = useIsMobile();

  // Mobile: manage query in local state
  const [mobileQuery, setMobileQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => {
    if (isMobile && isOpen) {
      setMobileQuery("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isMobile, isOpen]);

  const filterQuery = isMobile ? mobileQuery : query;
  const filtered = articles.filter((a) =>
    a.title.toLowerCase().includes(filterQuery.toLowerCase())
  );

  if (!isOpen || (!position && !isMobile)) return null;
  const popover = isMobile ? (
    <div
      ref={ref}
      className="fixed inset-0 w-full h-full bg-background z-[9999] flex flex-col"
      style={{}}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search articles..."
          value={mobileQuery}
          onChange={e => setMobileQuery(e.target.value)}
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
        <ul className="flex-1 overflow-y-auto px-2 pb-4">
          {filtered.map((a) => (
            <li
              key={a.url}
              className="flex items-center justify-between cursor-pointer px-2 py-2 rounded hover:bg-accent"
            >
              <div
                className="flex-1 min-w-0"
                onMouseDown={e => {
                  e.preventDefault();
                  onSelect(a);
                }}
              >
                <span className="font-medium">{a.title}</span>
                <span className="block text-xs text-muted-foreground truncate">{a.url}</span>
              </div>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 flex-shrink-0 text-muted-foreground hover:text-primary"
                tabIndex={-1}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink size={16} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  ) : (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: position!.top,
        left: position!.left,
        zIndex: 9999,
        minWidth: 320,
      }}
      className="rounded border border-border bg-background shadow-lg p-2 pt-3 pb-3 max-h-[min(16rem,80vh)] overflow-y-auto"
    >
      <div className="flex items-center text-xs text-muted-foreground mb-2 px-2">
        <Search size={14} className="mr-2" />
        <span>search help center articles</span>
      </div>
      {filtered.length === 0 ? (
        <div className="text-sm p-2">No articles found</div>
      ) : (
        <ul>
          {filtered.map((a) => (
            <li
              key={a.url}
              className="flex items-center justify-between cursor-pointer px-2 py-1 rounded hover:bg-accent"
            >
              <div
                className="flex-1 min-w-0"
                onMouseDown={e => {
                  e.preventDefault();
                  onSelect(a);
                }}
              >
                <span className="font-medium">{a.title}</span>
                <span className="block text-xs text-muted-foreground truncate">{a.url}</span>
              </div>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 flex-shrink-0 text-muted-foreground hover:text-primary"
                tabIndex={-1}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink size={16} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return createPortal(popover, document.body);
};

export default HelpArticleMentionPopover; 