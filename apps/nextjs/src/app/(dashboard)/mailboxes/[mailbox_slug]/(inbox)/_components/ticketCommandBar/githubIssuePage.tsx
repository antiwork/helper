import { Check, ExternalLinkIcon, SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import LoadingSpinner from "@/components/loadingSpinner";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import { useConversationContext } from "../conversationContext";

type GitHubIssuePageProps = {
  onOpenChange: (open: boolean) => void;
};

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  url: string;
  updatedAt: string;
}

export const GitHubIssuePage = ({ onOpenChange }: GitHubIssuePageProps) => {
  const { mailboxSlug, conversationSlug, data: conversation, refetch: refetchConversation } = useConversationContext();

  const [activeTab, setActiveTab] = useState("create");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedIssueNumber, setSelectedIssueNumber] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: mailbox } = api.mailbox.get.useQuery({ mailboxSlug });

  const { mutateAsync: createIssue, isPending: isCreating } =
    api.mailbox.conversations.github.createGitHubIssue.useMutation();
  const { mutateAsync: linkIssue, isPending: isLinking } =
    api.mailbox.conversations.github.linkExistingGitHubIssue.useMutation();
  const { mutateAsync: updateIssueState, isPending: isUpdatingState } =
    api.mailbox.conversations.github.updateGitHubIssueState.useMutation();

  const { data: issues, isLoading: isLoadingIssues } = api.mailbox.conversations.github.listRepositoryIssues.useQuery(
    {
      state: "open",
      mailboxSlug,
      conversationSlug,
    },
    {
      enabled: activeTab === "link",
      staleTime: 30000,
    },
  );

  const conversationWithGitHub = conversation as any;
  const hasLinkedIssue = conversationWithGitHub?.githubIssueNumber && conversationWithGitHub?.githubIssueUrl;
  const issueNumber = hasLinkedIssue ? conversationWithGitHub.githubIssueNumber : null;
  const issueUrl = hasLinkedIssue ? conversationWithGitHub.githubIssueUrl : null;
  const issueState = conversationWithGitHub?.githubIssueState || "open";
  const isIssueClosed = issueState === "closed";

  // Set initial values when conversation data is loaded
  useEffect(() => {
    if (conversation) {
      setTitle(conversation.subject || "");
      setBody(
        typeof conversation.summary === "string"
          ? conversation.summary
          : Array.isArray(conversation.summary)
            ? conversation.summary.join("\n\n")
            : "",
      );

      if (hasLinkedIssue) {
        setActiveTab("view");
      }
    }
  }, [conversation, hasLinkedIssue]);

  const handleCreateIssue = async () => {
    if (!mailbox?.githubConnected || !mailbox.githubRepoOwner || !mailbox.githubRepoName) {
      toast({
        title: "GitHub repository not configured",
        description: "Please configure a GitHub repository in the mailbox settings.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await createIssue({
        mailboxSlug,
        conversationSlug,
        title,
        body,
      });

      toast({
        title: "GitHub issue created",
        description: (
          <a href={result.issueUrl} target="_blank" rel="noopener noreferrer" className="underline">
            View issue #{result.issueNumber}
          </a>
        ),
        variant: "success",
      });
      onOpenChange(false);

      setTimeout(() => {
        refetchConversation();
      }, 500);
    } catch (error) {
      toast({
        title: "Failed to create GitHub issue",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleLinkIssue = async () => {
    if (!selectedIssueNumber) {
      toast({
        title: "No issue selected",
        description: "Please select an issue to link",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await linkIssue({
        mailboxSlug,
        conversationSlug,
        issueNumber: selectedIssueNumber,
      });

      toast({
        title: "GitHub issue linked",
        description: (
          <a href={result.issueUrl} target="_blank" rel="noopener noreferrer" className="underline">
            View issue #{result.issueNumber}
          </a>
        ),
        variant: "success",
      });
      onOpenChange(false);

      setTimeout(() => {
        refetchConversation();
      }, 500);
    } catch (error) {
      toast({
        title: "Failed to link GitHub issue",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleUpdateIssueState = async (newState: "open" | "closed") => {
    try {
      await updateIssueState({
        mailboxSlug,
        conversationSlug,
        state: newState,
      });

      toast({
        title: `GitHub issue ${newState === "open" ? "reopened" : "closed"}`,
        description: `Issue #${issueNumber} has been ${newState === "open" ? "reopened" : "closed"}.`,
        variant: "success",
      });

      if (newState === "closed") {
        onOpenChange(false);
      }

      setTimeout(() => {
        refetchConversation();
      }, 500);
    } catch (error) {
      toast({
        title: `Failed to ${newState === "open" ? "reopen" : "close"} GitHub issue`,
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Filter issues based on search term
  const filteredIssues =
    issues?.filter(
      (issue: GitHubIssue) =>
        issue.title.toLowerCase().includes(searchTerm.toLowerCase()) || issue.number.toString().includes(searchTerm),
    ) || [];

  // Only show if GitHub is connected and a repo is configured
  if (!mailbox?.githubConnected || !mailbox.githubRepoOwner || !mailbox.githubRepoName) {
    return (
      <div className="flex-1 flex flex-col p-4">
        <h3 className="font-medium mb-4">GitHub Repository Not Configured</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Please configure a GitHub repository in the mailbox settings to use this feature.
        </p>
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto">
      <h3 className="font-medium mb-4">GitHub Issue</h3>
      <p className="text-sm text-muted-foreground mb-4">Manage GitHub issues for this conversation.</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${hasLinkedIssue ? "grid-cols-3" : "grid-cols-2"}`}>
          {hasLinkedIssue && <TabsTrigger value="view">View Linked Issue</TabsTrigger>}
          <TabsTrigger value="create">Create New Issue</TabsTrigger>
          <TabsTrigger value="link">Link Existing Issue</TabsTrigger>
        </TabsList>

        {hasLinkedIssue && (
          <TabsContent value="view" className="space-y-4 mt-4">
            <div className="p-4 border rounded-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">
                  Issue #{issueNumber} - {isIssueClosed ? "Closed" : "Open"}
                </h3>
                <a
                  href={issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-blue-500 hover:underline"
                >
                  View on GitHub <ExternalLinkIcon className="h-3 w-3 ml-1" />
                </a>
              </div>
              <div className="space-y-2">
                {isIssueClosed ? (
                  <Button onClick={() => handleUpdateIssueState("open")} disabled={isUpdatingState} className="w-full">
                    {isUpdatingState ? <LoadingSpinner size="sm" /> : "Reopen Issue"}
                  </Button>
                ) : null}
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="create" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Description</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="resize-none"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCreateIssue} disabled={isCreating}>
              {isCreating ? <LoadingSpinner size="sm" /> : "Create Issue"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="link" className="space-y-4 mt-4">
          {isLoadingIssues ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          ) : issues && issues.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="issue">Search and select an issue</Label>
              <Command className="rounded-lg border">
                <div className="flex items-center border-b px-3">
                  <CommandInput
                    placeholder="Search issues..."
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                    className="h-9"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <CommandEmpty>No issues found</CommandEmpty>
                  <CommandGroup>
                    {filteredIssues.map((issue: GitHubIssue) => (
                      <CommandItem
                        key={issue.number}
                        onSelect={() => setSelectedIssueNumber(issue.number)}
                        className="flex items-center"
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${selectedIssueNumber === issue.number ? "opacity-100" : "opacity-0"}`}
                        />
                        <span>
                          #{issue.number} - {issue.title}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              </Command>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">No open issues found in the repository.</div>
          )}
          <div className="flex justify-end mt-4">
            <Button onClick={handleLinkIssue} disabled={isLinking || !selectedIssueNumber}>
              {isLinking ? <LoadingSpinner size="sm" /> : "Link Issue"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
