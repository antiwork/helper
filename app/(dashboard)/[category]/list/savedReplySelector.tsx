import { isMacOS } from "@tiptap/core";
import { ChevronDown, MessageSquareText as SavedReplyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { KeyboardShortcut } from "@/components/keyboardShortcut";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { stripHtmlTags } from "@/components/utils/html";
import { RouterOutputs } from "@/trpc";

type SavedReply = RouterOutputs["mailbox"]["savedReplies"]["list"][number];

interface SavedReplySelectorProps {
  savedReplies: SavedReply[];
  onSelect: (savedReply: { slug: string; content: string; name: string }) => void;
}

export function SavedReplySelector({ savedReplies, onSelect }: SavedReplySelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);

  const filteredReplies = savedReplies.filter(
    (reply) =>
      reply.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      stripHtmlTags(reply.content).toLowerCase().includes(searchValue.toLowerCase()),
  );

  const handleSelect = (savedReply: SavedReply) => {
    onSelect({
      slug: savedReply.slug,
      content: savedReply.content,
      name: savedReply.name,
    });
    setOpen(false);
    setSearchValue("");
  };

  useEffect(() => {
    if (!open) {
      setSearchValue("");
    }
  }, [open]);

  useHotkeys(
    "mod+slash",
    (e) => {
      e.preventDefault();
      setOpen((prev) => !prev);
    },
    {
      enableOnFormTags: ["INPUT", "TEXTAREA"],
      enableOnContentEditable: true,
    },
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={buttonRef}
          variant="outlined_subtle"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal"
        >
          <span className="flex items-center gap-2">
            <SavedReplyIcon className="h-4 w-4" />
            <span>Use saved reply</span>
          </span>
          <div className="flex items-center gap-2">
            <KeyboardShortcut className="text-muted-foreground">{isMacOS() ? "⌘/" : "Ctrl+/"}</KeyboardShortcut>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start" style={{ width: buttonRef.current?.offsetWidth }}>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search saved replies..." value={searchValue} onValueChange={setSearchValue} />
          <CommandList>
            <CommandEmpty>No saved replies found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-auto">
              {filteredReplies.map((savedReply) => (
                <CommandItem
                  key={savedReply.slug}
                  value={savedReply.slug}
                  onSelect={() => handleSelect(savedReply)}
                  className="flex flex-col items-start gap-1 py-3 cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{savedReply.name}</span>
                    <span className="text-xs text-muted-foreground">Used {savedReply.usageCount} times</span>
                  </div>
                  <span className="text-sm text-muted-foreground line-clamp-2">
                    {stripHtmlTags(savedReply.content)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
