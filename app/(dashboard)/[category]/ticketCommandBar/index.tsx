import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useConversationContext } from "@/app/(dashboard)/[category]/conversation/conversationContext";
import { useAssignTicket } from "@/app/(dashboard)/[category]/conversation/useAssignTicket";
import { isInDialog } from "@/components/isInDialog";
import { KeyboardShortcut } from "@/components/keyboardShortcut";
import { Button } from "@/components/ui/button";
import { Command } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { useMembers } from "@/components/useMembers";
import { useSession } from "@/components/useSession";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useAssigneesPage } from "./assigneesPage";
import { CommandList } from "./commandList";
import { GitHubIssuePage } from "./githubIssuePage";
import { useMainPage } from "./mainPage";
import { NotesPage } from "./notesPage";
import { usePreviousRepliesPage } from "./previousRepliesPage";
import { SuggestedActions } from "./suggestedActions";
import { Tool, ToolForm } from "./toolForm";

type TicketCommandBarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertReply: (content: string) => void;
  onToggleCc: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
};

export function TicketCommandBar({ open, onOpenChange, onInsertReply, onToggleCc, inputRef }: TicketCommandBarProps) {
  const { conversationSlug } = useConversationContext();
  const [inputValue, setInputValue] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [page, setPage] = useState<"main" | "previous-replies" | "assignees" | "notes" | "github-issue">("main");
  const pageRef = useRef<string>("main");
  const { user: currentUser } = useSession() ?? {};
  const { data: orgMembers } = useMembers();
  const { data: tools } = api.mailbox.conversations.tools.list.useQuery(
    { conversationSlug },
    { staleTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false, enabled: !!conversationSlug },
  );
  const { assignTicket } = useAssignTicket();

  const [isLoadingPreviousReplies, setIsLoadingPreviousReplies] = useState(false);
  const { data: previousReplies, refetch: refetchPreviousReplies } =
    api.mailbox.conversations.messages.previousReplies.useQuery(
      {
        conversationSlug,
      },
      {
        enabled: false,
        refetchOnMount: true,
      },
    );

  const mainPageGroups = useMainPage({
    onOpenChange,
    setPage,
    setSelectedItemId,
    onToggleCc,
    setSelectedTool,
    onInsertReply,
  });

  const previousRepliesGroups = usePreviousRepliesPage({
    previousReplies,
    onInsertReply,
    onOpenChange,
    setPage,
  });

  const assigneesGroups = useAssigneesPage({
    orgMembers,
    currentUserId: currentUser?.id,
    onAssignTicket: (assignedTo) => assignTicket(assignedTo, null),
    onOpenChange,
  });

  const currentGroups = (() => {
    switch (page) {
      case "main":
        return mainPageGroups;
      case "previous-replies":
        return previousRepliesGroups;
      case "assignees":
        return assigneesGroups;
      case "notes":
        return [];
      case "github-issue":
        return [];
      default:
        return mainPageGroups;
    }
  })();

  const visibleGroups = currentGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.hidden) return false;

        const searchTerm = inputValue.toLowerCase();
        const matchesLabel = item.label.toLowerCase().includes(searchTerm);
        const matchesShortcut = item.shortcut?.toLowerCase().includes(searchTerm);
        const matchesDescription = item.description?.toLowerCase().includes(searchTerm);

        return matchesLabel || matchesShortcut || matchesDescription;
      }),
    }))
    .filter((group) => group.items.length > 0);
  const visibleItems = visibleGroups.flatMap((group) => group.items);

  useEffect(() => {
    pageRef.current = `${page}-${selectedTool ? selectedTool.slug : "none"}`;
  }, [page, selectedTool]);

  // Reset selection when dialog opens/closes or page changes
  useEffect(() => {
    setSelectedItemId(visibleItems[0]?.id ?? null);
    setInputValue("");

    if (page === "previous-replies") {
      setIsLoadingPreviousReplies(true);
      void refetchPreviousReplies().finally(() => {
        setIsLoadingPreviousReplies(false);
      });
    }

    if (!open) {
      // Wait for the close animation
      setTimeout(() => {
        setPage("main");
        setSelectedTool(null);
      }, 500);
    }
  }, [open, page, refetchPreviousReplies]);

  useEffect(() => {
    setSelectedItemId(visibleItems[0]?.id ?? null);
  }, [inputValue]);

  useHotkeys("/", () => inputRef.current?.focus(), {
    enabled: () => !isInDialog(),
    preventDefault: true,
  });

  const handleSelect = (itemId: string) => {
    const selectedItem = visibleItems.find((item) => item.id === itemId);

    if (selectedItem?.id === "previous-replies") {
      setPage("previous-replies");
      setSelectedItemId(null);
    } else if (selectedItem?.id === "assign") {
      setPage("assignees");
      setSelectedItemId(null);
    } else if (selectedItem?.id === "add-note") {
      setPage("notes");
      setSelectedItemId(null);
    } else if (selectedItem?.id === "github-issue") {
      setPage("github-issue");
      setSelectedItemId(null);
    } else {
      selectedItem?.onSelect();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = visibleItems.findIndex((item) => item.id === selectedItemId);

    const updateSelection = (newIndex: number) => {
      e.preventDefault();
      const newId = visibleItems[newIndex]?.id ?? null;
      setSelectedItemId(newId);
    };

    switch (e.key) {
      case "ArrowDown":
        if (currentIndex === -1) {
          updateSelection(0);
        } else {
          updateSelection((currentIndex + 1) % visibleItems.length);
        }
        break;
      case "ArrowUp":
        if (currentIndex === -1) {
          updateSelection(visibleItems.length - 1);
        } else {
          updateSelection((currentIndex - 1 + visibleItems.length) % visibleItems.length);
        }
        break;
      case "ArrowLeft":
        if (page === "previous-replies" || page === "assignees") {
          e.preventDefault();
          setPage("main");
        }
        break;
      case "Enter":
        if (selectedItemId) {
          e.preventDefault();
          handleSelect(selectedItemId);
        }
        break;
      case "Escape":
        if (page === "previous-replies" || page === "assignees") {
          setPage("main");
        } else {
          onOpenChange(false);
        }
        break;
      case "Backspace":
        if ((page === "previous-replies" || page === "assignees") && !inputValue) {
          setPage("main");
        }
        break;
    }
  };

  return open && page === "notes" ? (
    <FormPage onOpenChange={onOpenChange}>
      <NotesPage onOpenChange={onOpenChange} />
    </FormPage>
  ) : open && selectedTool ? (
    <FormPage onOpenChange={onOpenChange}>
      <ToolForm tool={selectedTool} onOpenChange={onOpenChange} />
    </FormPage>
  ) : open && page === "github-issue" ? (
    <FormPage onOpenChange={onOpenChange}>
      <GitHubIssuePage onOpenChange={onOpenChange} />
    </FormPage>
  ) : (
    <>
      <div>
        <Input
          ref={inputRef}
          placeholder={page === "previous-replies" ? "Search previous replies..." : "Type a command..."}
          className="rounded-sm rounded-b-none"
          iconsPrefix={<KeyboardShortcut className="text-muted-foreground">/</KeyboardShortcut>}
          onFocus={() => onOpenChange(true)}
          onBlur={() => {
            const oldPage = pageRef.current;

            // Changing page blurs the input temporarily, so wait and see if the blur was because of the page change
            setTimeout(() => {
              if (pageRef.current === oldPage) onOpenChange(false);
              else inputRef.current?.focus();
            }, 100);
          }}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Command Bar Input"
        />
      </div>
      <SuggestedActions
        className={open ? "hidden" : undefined}
        tools={tools?.suggested ?? null}
        orgMembers={orgMembers ?? null}
      />
      <Command
        loop
        value={selectedItemId || ""}
        onValueChange={setSelectedItemId}
        className={cn(
          "rounded-t-none flex-1 flex flex-col overflow-hidden border-t [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5",
          !open && "hidden",
        )}
        data-testid="command-bar"
      >
        <CommandList
          isLoading={isLoadingPreviousReplies}
          page={page}
          groups={visibleGroups}
          onSelect={handleSelect}
          onMouseEnter={setSelectedItemId}
          selectedItemId={selectedItemId}
        />
      </Command>
    </>
  );
}

const FormPage = ({ onOpenChange, children }: { onOpenChange: (open: boolean) => void; children: React.ReactNode }) => {
  return (
    <div className="flex-1 min-h-0 overflow-auto relative bg-background rounded">
      <Button variant="ghost" iconOnly className="absolute top-2 right-2" onClick={() => onOpenChange(false)}>
        <X className="w-4 h-4" />
      </Button>
      {children}
    </div>
  );
};
