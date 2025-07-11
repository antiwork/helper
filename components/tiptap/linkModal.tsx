import { ExternalLink } from "lucide-react";
import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { useOnOutsideClick } from "@/components/useOnOutsideClick";

type LinkModalProps = {
  isLinkModalOpen: boolean;
  linkData: { url: string; text: string };
  setLinkModalOpen: (open: boolean) => void;
  setLinkData: (data: { url: string; text: string }) => void;
  setLink: () => void;
};

const LinkModal = ({ isLinkModalOpen, linkData, setLinkData, setLinkModalOpen, setLink }: LinkModalProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useOnOutsideClick([containerRef], () => setLinkModalOpen(false));
  useEffect(() => inputRef.current?.focus(), [isLinkModalOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setLink();
    }
  };

  const isValid = linkData.url && /^https?:\/\//.test(linkData.url);

  return (
    <div
      ref={containerRef}
      className="flex w-full sm:w-96 flex-col gap-2 rounded-lg border border-border bg-background p-4 shadow-lg"
    >
      <div className="relative flex items-center">
        <Input
          ref={inputRef}
          type="url"
          placeholder="URL"
          autoFocus
          value={linkData.url}
          onChange={(e) => setLinkData({ ...linkData, url: e.target.value })}
          onKeyDown={handleKeyDown}
          className="h-10 pr-10"
        />
        {linkData.url ? (
          <a
            href={isValid ? linkData.url : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary ${!isValid ? "pointer-events-none opacity-40" : ""}`}
            tabIndex={-1}
            aria-label="Open link in new tab"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => !isValid && e.preventDefault()}
          >
            <ExternalLink size={18} />
          </a>
        ) : null}
      </div>
      <Input
        type="text"
        placeholder="Link text"
        value={linkData.text}
        onChange={(e) => setLinkData({ ...linkData, text: e.target.value })}
        className="h-10"
      />
      <button
        type="button"
        onClick={setLink}
        className="border-primary bg-primary hover:bg-primary inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm text-primary-foreground"
      >
        {linkData.text ? "Update link" : "Add link"}
      </button>
    </div>
  );
};

export default LinkModal;
