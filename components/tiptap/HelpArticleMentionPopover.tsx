import React from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Search } from "lucide-react";
import { useOnOutsideClick } from "@/components/useOnOutsideClick";

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
  const filtered = articles.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase())
  );
  if (!isOpen || !position) return null;
  const popover = (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 9999,
        minWidth: 320,
      }}
      className="rounded border border-border bg-background shadow-lg p-2 pt-3 pb-3"
    >
      <div className="flex items-center text-xs text-muted-foreground mb-2 px-2">
        <Search size={14} className="mr-2" />
        <span>search help center articles</span>
      </div>
      {filtered.length === 0 ? (
        <div className="text-sm p-2">No articles found</div>
      ) : (
        <ul className="max-h-64 overflow-y-auto">
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