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

  return (
    <div
      ref={containerRef}
      className="flex w-full sm:w-96 flex-col gap-2 rounded-lg border border-border bg-background p-4 shadow-lg"
    >
      <Input
        ref={inputRef}
        type="url"
        placeholder="URL"
        autoFocus
        value={linkData.url}
        onChange={(e) => setLinkData({ ...linkData, url: e.target.value })}
        onKeyDown={handleKeyDown}
        className="h-10"
      />
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
