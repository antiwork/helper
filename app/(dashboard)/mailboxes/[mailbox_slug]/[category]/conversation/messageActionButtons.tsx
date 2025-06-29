import { isMacOS } from "@tiptap/core";
import { CornerUpLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeyboardShortcut } from "@/components/keyboardShortcut";
import { useBreakpoint } from "@/components/useBreakpoint";
import { RouterOutputs } from "@/trpc";
import { useConversationsListInput } from "../shared/queries";

type ConversationData = RouterOutputs["mailbox"]["conversations"]["get"];

interface MessageActionButtonsProps {
    conversation: ConversationData | null;
    sendDisabled: boolean;
    sending: boolean;
    onSend: (options: { assign: boolean; close?: boolean }) => void;
    onUpdateStatus: (status: "closed" | "spam" | "open") => Promise<void>;
}

export const MessageActionButtons = ({
    conversation,
    sendDisabled,
    sending,
    onSend,
    onUpdateStatus,
}: MessageActionButtonsProps) => {
    const { isAboveMd } = useBreakpoint("md");
    const { searchParams } = useConversationsListInput();

    const conversationStatus = conversation?.status ?? searchParams.status;

    if (conversationStatus === "spam") {
        return null;
    }

    if (conversationStatus === "closed") {
        return (
            <div className="flex items-center gap-4 md:flex-row-reverse">
                <Button variant="outlined" onClick={() => onUpdateStatus("open")}>
                    <CornerUpLeft className="mr-2 h-4 w-4" />
                    Reopen
                </Button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4 md:flex-row-reverse">
            <Button
                size={isAboveMd ? "default" : "sm"}
                variant="outlined"
                onClick={() => onSend({ assign: false, close: false })}
                disabled={sendDisabled}
            >
                Reply
                {!sending && isMacOS() && (
                    <KeyboardShortcut className="ml-2 text-sm border-primary/50">⌥⏎</KeyboardShortcut>
                )}
            </Button>
            <Button
                size={isAboveMd ? "default" : "sm"}
                onClick={() => onSend({ assign: false })}
                disabled={sendDisabled}
            >
                {sending ? "Replying..." : "Reply and close"}
                {!sending && isMacOS() && (
                    <KeyboardShortcut className="ml-2 text-sm border-bright-foreground/50">⌘⏎</KeyboardShortcut>
                )}
            </Button>
        </div>
    );
};
