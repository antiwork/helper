import {
  CornerUpLeft as ArrowUturnLeftIcon,
  CornerRightUp as ArrowUturnUpIcon,
  MessageSquare as ChatBubbleLeftIcon,
  Mail as EnvelopeIcon,
  PenSquare as PencilSquareIcon,
  Play as PlayIcon,
  MessageSquareText as SavedReplyIcon,
  ShieldAlert as ShieldExclamationIcon,
  Sparkles as SparklesIcon,
  User as UserIcon,
} from "lucide-react";
import { useCallback, useMemo, useRef } from "react";
import { useConversationContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/conversationContext";
import { Tool } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/ticketCommandBar/toolForm";
import { toast } from "@/components/hooks/use-toast";
import useKeyboardShortcut from "@/components/useKeyboardShortcut";
import { api } from "@/trpc/react";
import GitHubSvg from "../icons/github.svg";
import { CommandGroup } from "./types";

type MainPageProps = {
  onOpenChange: (open: boolean) => void;
  setPage: (page: "main" | "previous-replies" | "assignees" | "notes" | "github-issue") => void;
  setSelectedItemId: (id: string | null) => void;
  onToggleCc: () => void;
  setSelectedTool: (tool: Tool) => void;
  onInsertReply: (content: string) => void;
};

export const useMainPage = ({
  onOpenChange,
  setPage,
  setSelectedItemId,
  onToggleCc,
  setSelectedTool,
  onInsertReply,
}: MainPageProps): CommandGroup[] => {
  const { data: conversation, updateStatus, mailboxSlug, conversationSlug } = useConversationContext();
  const utils = api.useUtils();

  const dismissToastRef = useRef<() => void>(() => {});
  const { mutate: generateDraft } = api.mailbox.conversations.generateDraft.useMutation({
    onMutate: () => {
      dismissToastRef.current = toast({
        title: "Generating draft...",
        duration: 30_000,
      }).dismiss;
    },
    onSuccess: (draft) => {
      dismissToastRef.current?.();
      if (draft) {
        utils.mailbox.conversations.get.setData({ mailboxSlug, conversationSlug }, (data) =>
          data ? { ...data, draft } : data,
        );
      } else {
        toast({
          variant: "destructive",
          title: "Error generating draft",
        });
      }
    },
    onError: () => {
      dismissToastRef.current?.();
      toast({
        variant: "destructive",
        title: "Error generating draft",
      });
    },
  });

  const { data: tools } = api.mailbox.conversations.tools.list.useQuery(
    { mailboxSlug, conversationSlug },
    { staleTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false, enabled: !!conversationSlug },
  );

  const { data: savedReplies } = api.mailbox.savedReplies.list.useQuery(
    { mailboxSlug, onlyActive: true },
    { staleTime: 300_000, refetchOnMount: false, refetchOnWindowFocus: false },
  );

  const { mutate: incrementSavedReplyUsage } = api.mailbox.savedReplies.incrementUsage.useMutation();

  const { data: mailbox } = api.mailbox.get.useQuery(
    { mailboxSlug },
    { staleTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false, enabled: !!mailboxSlug },
  );

  const isGitHubConnected = mailbox?.githubConnected && mailbox.githubRepoOwner && mailbox.githubRepoName;

  useKeyboardShortcut("n", (e) => {
    e.preventDefault();
    onOpenChange(true);
    setPage("notes");
    setSelectedItemId(null);
  });

  const handleSavedReplySelect = useCallback(
    (savedReply: { slug: string; content: string }) => {
      try {
        onInsertReply(savedReply.content);
        incrementSavedReplyUsage({ mailboxSlug, slug: savedReply.slug });
        onOpenChange(false);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error using saved reply",
          description: "Failed to insert saved reply content. Please try again.",
        });
      }
    },
    [onInsertReply, incrementSavedReplyUsage, mailboxSlug, onOpenChange],
  );

  const mainCommandGroups = useMemo(
    () => [
      {
        heading: "Actions",
        items: [
          {
            id: "close",
            label: "Close ticket",
            icon: ArrowUturnLeftIcon,
            onSelect: () => {
              updateStatus("closed");
              onOpenChange(false);
            },
            shortcut: "C",
            hidden: conversation?.status === "closed" || conversation?.status === "spam",
          },
          {
            id: "reopen",
            label: "Reopen ticket",
            icon: ArrowUturnUpIcon,
            onSelect: () => {
              updateStatus("open");
              onOpenChange(false);
            },
            shortcut: "Z",
            hidden: conversation?.status === "open",
          },
          {
            id: "assign",
            label: "Assign ticket",
            icon: UserIcon,
            onSelect: () => {
              setPage("assignees");
              setSelectedItemId(null);
            },
            shortcut: "A",
          },
          {
            id: "spam",
            label: "Mark as spam",
            icon: ShieldExclamationIcon,
            onSelect: () => {
              updateStatus("spam");
              onOpenChange(false);
            },
            shortcut: "S",
            hidden: conversation?.status === "spam",
          },
          {
            id: "add-note",
            label: "Add internal note",
            icon: PencilSquareIcon,
            onSelect: () => {
              setPage("notes");
              setSelectedItemId(null);
            },
            shortcut: "N",
          },
          {
            id: "github-issue",
            label: conversation?.githubIssueNumber ? "Manage GitHub Issue" : "Link GitHub Issue",
            icon: GitHubSvg,
            onSelect: () => {
              setPage("github-issue");
              setSelectedItemId(null);
            },
            shortcut: "G",
            hidden: !isGitHubConnected,
          },
        ],
      },
      {
        heading: "Compose",
        items: [
          {
            id: "generate-draft",
            label: "Generate draft",
            icon: SparklesIcon,
            onSelect: () => {
              if (conversation?.slug) {
                generateDraft({ mailboxSlug, conversationSlug: conversation.slug });
              }
              onOpenChange(false);
            },
          },
          {
            id: "previous-replies",
            label: "Use previous replies",
            icon: ChatBubbleLeftIcon,
            onSelect: () => {
              setPage("previous-replies");
              setSelectedItemId(null);
            },
          },
          {
            id: "toggle-cc-bcc",
            label: "Add CC or BCC",
            icon: EnvelopeIcon,
            onSelect: () => {
              onToggleCc();
              onOpenChange(false);
            },
          },
        ],
      },
      ...(savedReplies && savedReplies.length > 0
        ? [
            {
              heading: "Saved replies",
              items: savedReplies.slice(0, 10).map((savedReply) => ({
                id: savedReply.slug,
                label: savedReply.name,
                icon: SavedReplyIcon,
                onSelect: () => handleSavedReplySelect(savedReply),
              })),
            },
          ]
        : []),
      ...(tools && tools.all.length > 0
        ? [
            {
              heading: "Tools",
              items: tools.all.map((tool) => ({
                id: tool.slug,
                label: tool.name,
                icon: PlayIcon,
                onSelect: () => setSelectedTool(tool),
              })),
            },
          ]
        : []),
    ],
    [onOpenChange, conversation, tools?.suggested, onToggleCc, isGitHubConnected, savedReplies, handleSavedReplySelect],
  );

  return mainCommandGroups;
};
