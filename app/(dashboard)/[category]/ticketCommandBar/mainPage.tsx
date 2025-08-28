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
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { useConversationContext } from "@/app/(dashboard)/[category]/conversation/conversationContext";
import { Tool } from "@/app/(dashboard)/[category]/ticketCommandBar/toolForm";
import { isInDialog } from "@/components/isInDialog";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
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
  const { data: conversation, updateStatus, conversationSlug } = useConversationContext();
  const utils = api.useUtils();

  const dismissToastRef = useRef<() => void>(() => {});
  const { mutate: generateDraft } = api.mailbox.conversations.generateDraft.useMutation({
    onMutate: () => {
      const toastId = toast("Generating draft...", {
        duration: 30_000,
      });
      dismissToastRef.current = () => toast.dismiss(toastId);
    },
    onSuccess: (draft) => {
      dismissToastRef.current?.();
      if (draft) {
        utils.mailbox.conversations.get.setData({ conversationSlug }, (data) => (data ? { ...data, draft } : data));
      } else {
        toast.error("Error generating draft");
      }
    },
    onError: () => {
      dismissToastRef.current?.();
      toast.error("Error generating draft");
    },
  });

  const { data: tools } = api.mailbox.conversations.tools.list.useQuery(
    { conversationSlug },
    { staleTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false, enabled: !!conversationSlug },
  );

  const { data: savedReplies } = api.mailbox.savedReplies.list.useQuery(
    { onlyActive: true },
    { refetchOnWindowFocus: false, refetchOnMount: true },
  );

  const { mutate: incrementSavedReplyUsage } = api.mailbox.savedReplies.incrementUsage.useMutation();

  const { data: mailbox } = api.mailbox.get.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const isGitHubConnected = mailbox?.githubConnected && mailbox.githubRepoOwner && mailbox.githubRepoName;

  useHotkeys(
    "n",
    () => {
      onOpenChange(true);
      setPage("notes");
      setSelectedItemId(null);
    },
    {
      enabled: () => !isInDialog(),
      preventDefault: true,
    },
  );

  const handleSavedReplySelect = useCallback(
    (savedReply: { slug: string; content: string }) => {
      try {
        if (!onInsertReply) {
          throw new Error("onInsertReply function is not available");
        }

        onInsertReply(savedReply.content);
        onOpenChange(false);

        // Track usage separately - don't fail the insertion if tracking fails
        incrementSavedReplyUsage(
          { slug: savedReply.slug },
          {
            onError: (error) => {
              // Log tracking error but don't show to user since content was inserted successfully
              captureExceptionAndLog("Failed to track saved reply usage:", error);
            },
          },
        );
      } catch (error) {
        captureExceptionAndLog("Failed to insert saved reply content", {
          extra: {
            error,
          },
        });
        toast.error("Failed to insert saved reply", {
          description: "Could not insert the saved reply content. Please try again.",
        });
      }
    },
    [onInsertReply, incrementSavedReplyUsage, onOpenChange],
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
                generateDraft({ conversationSlug: conversation.slug });
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
              items: savedReplies.map((savedReply) => ({
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
