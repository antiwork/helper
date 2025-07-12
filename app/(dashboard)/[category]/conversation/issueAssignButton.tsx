"use client";

import { GitBranch, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/trpc/react";
import { useConversationContext } from "./conversationContext";

export const IssueAssignButton = ({ initialIssueGroupId }: { initialIssueGroupId: number | null }) => {
  const { conversationSlug, data: conversationInfo } = useConversationContext();
  const [selectedIssueId, setSelectedIssueId] = useState<string>(
    initialIssueGroupId ? initialIssueGroupId.toString() : "none",
  );

  const { data: issueGroups } = api.mailbox.issueGroups.listAll.useQuery();
  const utils = api.useUtils();

  const assignMutation = api.mailbox.issueGroups.assignConversation.useMutation({
    onSuccess: () => {
      toast.success("Issue assignment updated successfully");
      // Refresh conversation data
      utils.mailbox.conversations.get.invalidate({ conversationSlug });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const currentIssue = issueGroups?.groups.find((group) => group.id === initialIssueGroupId);

  const handleAssign = (issueGroupId: string) => {
    setSelectedIssueId(issueGroupId);

    const issueId = issueGroupId === "none" ? null : parseInt(issueGroupId);

    if (conversationInfo?.id) {
      assignMutation.mutate({
        conversationId: conversationInfo.id,
        issueGroupId: issueId,
      });
    }
  };

  const handleClear = () => {
    setSelectedIssueId("none");
    if (conversationInfo?.id) {
      assignMutation.mutate({
        conversationId: conversationInfo.id,
        issueGroupId: null,
      });
    }
  };

  if (!issueGroups?.groups.length) {
    return <span className="text-muted-foreground text-sm">No issues available</span>;
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Select value={selectedIssueId} onValueChange={handleAssign}>
        <SelectTrigger className="w-full h-8 text-sm min-w-0">
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            <GitBranch className="h-3 w-3 flex-shrink-0" />
            <SelectValue placeholder="Assign to issue..." className="truncate min-w-0" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground text-sm">No issue assigned</span>
          </SelectItem>
          {issueGroups.groups.map((group) => (
            <SelectItem key={group.id} value={group.id.toString()}>
              <span className="text-sm truncate block max-w-[200px]" title={group.title}>
                {group.title}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentIssue && (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={handleClear}
          className="h-8 w-8 flex-shrink-0"
          title="Clear issue assignment"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
