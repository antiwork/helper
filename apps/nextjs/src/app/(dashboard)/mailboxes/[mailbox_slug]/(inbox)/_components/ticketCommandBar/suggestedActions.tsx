import { Fragment } from "react";
import { useConversationContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/conversationContext";
import { formatParameter } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/toolItem";
import { useAssignTicket } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/useAssignTicket";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToolExecution } from "@/hooks/useToolExecution";
import { cn } from "@/lib/utils";
import { RouterOutputs } from "@/trpc";

export function SuggestedActions({
  tools,
  orgMembers,
  className,
}: {
  tools: RouterOutputs["mailbox"]["conversations"]["tools"]["list"]["suggested"] | null;
  orgMembers: RouterOutputs["organization"]["getMembers"] | null;
  className?: string;
}) {
  const { updateStatus } = useConversationContext();
  const { assignTicket } = useAssignTicket();
  const { handleToolExecution } = useToolExecution();

  if (tools?.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-3 px-3 py-2 bg-background border border-t-0 rounded-b-sm", className)}>
      <span className="text-xs text-muted-foreground font-medium">Suggested</span>
      {tools?.map((t, index) => {
        switch (t.type) {
          case "close":
            return (
              <Button
                key={`${t.type}-${index}`}
                variant="subtle"
                size="sm"
                className="h-7"
                onClick={() => updateStatus("closed")}
              >
                Close
              </Button>
            );
          case "spam":
            return (
              <Button
                key={`${t.type}-${index}`}
                variant="subtle"
                size="sm"
                className="h-7"
                onClick={() => updateStatus("spam")}
              >
                Spam
              </Button>
            );
          case "assign":
            const assignee = orgMembers?.find((m) => m.id === t.clerkUserId);
            if (!assignee)
              return (
                <span key={`${t.type}-${index}`} className="text-xs text-muted-foreground">
                  Assign to {t.clerkUserId}
                </span>
              );
            return (
              <Button
                key={`${t.type}-${index}`}
                variant="subtle"
                size="sm"
                className="h-7"
                onClick={() => assignTicket(assignee)}
              >
                Assign to {assignee.displayName}
              </Button>
            );
          case "tool":
            return (
              <TooltipProvider key={`${t.type}-${index}`} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="subtle"
                      size="sm"
                      className="h-7"
                      onClick={() => handleToolExecution(t.tool.slug, t.tool.name, t.tool.parameters)}
                    >
                      {t.tool.name}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent variant="light">
                    <p className="mb-2">{t.tool.description}</p>
                    <div className="font-medium">Parameters</div>
                    <div className="grid grid-cols-[auto_1fr] gap-1">
                      {Object.entries(t.tool.parameters ?? {}).map(([name, value]) => (
                        <Fragment key={name}>
                          <span>{formatParameter(name)}:</span>
                          <span className="truncate font-mono" title={JSON.stringify(value)}>
                            {JSON.stringify(value)}
                          </span>
                        </Fragment>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          default:
            return null;
        }
      })}
      {!tools && (
        <>
          <div className="rounded-sm h-7 w-24 bg-muted animate-skeleton" />
          <div className="rounded-sm h-7 w-24 bg-muted animate-skeleton" />
        </>
      )}
    </div>
  );
}
