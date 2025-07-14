import { useToolExecution } from "components/useToolExecution";
import { Fragment } from "react";
import { useConversationContext } from "@/app/(dashboard)/[category]/conversation/conversationContext";
import { formatParameter } from "@/app/(dashboard)/[category]/conversation/toolItem";
import { useAssignTicket } from "@/app/(dashboard)/[category]/conversation/useAssignTicket";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
    <div
      className={cn("flex items-center border border-t-0 rounded-b-sm bg-background w-full overflow-hidden", className)}
    >
      <span className="shrink-0 px-3 py-2 text-xs text-muted-foreground font-medium">Suggested</span>
      <div className="flex items-center gap-3 overflow-x-auto py-2 pr-3 min-w-0 w-full">
        {tools?.map((t, index) => {
          switch (t.type) {
            case "close":
              return (
                <Button
                  key={`${t.type}-${index}`}
                  variant="subtle"
                  size="sm"
                  className="shrink-0 h-7 whitespace-nowrap"
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
                  className="shrink-0 h-7 whitespace-nowrap"
                  onClick={() => updateStatus("spam")}
                >
                  Spam
                </Button>
              );
            case "assign":
              const assignee = orgMembers?.find((m) => m.id === t.userId);
              if (!assignee) return null;
              return (
                <Button
                  key={`${t.type}-${index}`}
                  variant="subtle"
                  size="sm"
                  className="shrink-0 h-7 whitespace-nowrap"
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
                        className="shrink-0 h-7 whitespace-nowrap"
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
            <div className="shrink-0 rounded-sm h-7 w-24 bg-muted animate-skeleton" />
            <div className="shrink-0 rounded-sm h-7 w-24 bg-muted animate-skeleton" />
          </>
        )}
      </div>
    </div>
  );
}
