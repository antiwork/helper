import { ExternalLinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import LoadingSpinner from "@/components/loadingSpinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import GitHubSvg from "../../_components/icons/github.svg";

interface GitHubIssueButtonProps {
  mailboxSlug: string;
  conversationSlug: string;
  conversationSubject: string;
  conversationSummary?: string | string[] | null;
}

// Define the GitHub issue type
interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  url: string;
  updatedAt: string;
}

export const GitHubIssueButton = ({
  mailboxSlug,
  conversationSlug,
  conversationSubject,
  conversationSummary,
}: GitHubIssueButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isUpdatingState, setIsUpdatingState] = useState(false);
  const [activeTab, setActiveTab] = useState("create");
  const [title, setTitle] = useState(conversationSubject || "");
  const [body, setBody] = useState(
    typeof conversationSummary === "string"
      ? conversationSummary
      : Array.isArray(conversationSummary)
        ? conversationSummary.join("\n\n")
        : "",
  );
  const [selectedIssueNumber, setSelectedIssueNumber] = useState<number | null>(null);

  // Get conversation details to check if a GitHub issue is already linked
  const { data: conversation, refetch: refetchConversation } = api.mailbox.conversations.get.useQuery(
    { mailboxSlug, conversationSlug },
    { staleTime: 10000 }, // 10 seconds
  );

  const { data: mailbox } = api.mailbox.get.useQuery({ mailboxSlug });

  // Use type assertion to access the new endpoints
  const { mutateAsync: createIssue } = (api.mailbox.conversations as any).createGitHubIssue.useMutation();
  const { mutateAsync: linkIssue } = (api.mailbox.conversations as any).linkExistingGitHubIssue.useMutation();
  const { mutateAsync: updateIssueState } = (api.mailbox.conversations as any).updateGitHubIssueState.useMutation();

  const {
    data: issues,
    isLoading: isLoadingIssues,
    refetch: refetchIssues,
  } = (api.mailbox.conversations as any).listRepositoryIssues.useQuery(
    {
      state: "open",
      mailboxSlug,
    },
    {
      enabled: isOpen && activeTab === "link",
      staleTime: 30000, // 30 seconds
    },
  );

  // Debug log to see what's in the conversation object
  useEffect(() => {
    if (conversation) {
      console.log("Conversation data:", conversation);
    }
  }, [conversation]);

  // Check if this conversation already has a linked GitHub issue
  // Use type assertion to safely access the properties
  const conversationWithGitHub = conversation as any;
  const hasLinkedIssue = conversationWithGitHub?.githubIssueNumber && conversationWithGitHub?.githubIssueUrl;
  const issueNumber = hasLinkedIssue ? conversationWithGitHub.githubIssueNumber : null;
  const issueUrl = hasLinkedIssue ? conversationWithGitHub.githubIssueUrl : null;
  const conversationStatus = conversationWithGitHub?.status;
  const isIssueClosed = conversationStatus === "closed";

  const handleCreateIssue = async () => {
    if (!mailbox?.githubConnected || !mailbox.githubRepoOwner || !mailbox.githubRepoName) {
      toast({
        title: "GitHub repository not configured",
        description: "Please configure a GitHub repository in the mailbox settings.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
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
      setIsOpen(false);

      // Refetch the conversation to update the UI
      setTimeout(() => {
        refetchConversation();
      }, 500); // Add a small delay to ensure the database has been updated
    } catch (error) {
      toast({
        title: "Failed to create GitHub issue",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
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

    setIsLinking(true);
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
      setIsOpen(false);

      // Refetch the conversation to update the UI
      setTimeout(() => {
        refetchConversation();
      }, 500); // Add a small delay to ensure the database has been updated
    } catch (error) {
      toast({
        title: "Failed to link GitHub issue",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleUpdateIssueState = async (newState: "open" | "closed") => {
    setIsUpdatingState(true);
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

      // Refetch the conversation to update the UI
      setTimeout(() => {
        refetchConversation();
      }, 500); // Add a small delay to ensure the database has been updated
    } catch (error) {
      toast({
        title: `Failed to ${newState === "open" ? "reopen" : "close"} GitHub issue`,
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingState(false);
    }
  };

  if (!mailbox) return null;

  // Only show the button if GitHub is connected and a repo is configured
  if (!mailbox.githubConnected || !mailbox.githubRepoOwner || !mailbox.githubRepoName) return null;

  // If there's already a linked issue, show the issue information with appropriate actions
  if (hasLinkedIssue) {
    return (
      <div className="flex items-center gap-2">
        <a href={issueUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <GitHubSvg className="h-4 w-4 object-contain" />
            GitHub Issue #{String(issueNumber)}
            <ExternalLinkIcon className="h-3 w-3 ml-1" />
          </Button>
        </a>

        {isIssueClosed ? (
          <Button
            variant="outlined"
            size="sm"
            onClick={() => handleUpdateIssueState("open")}
            disabled={isUpdatingState}
            className="text-xs"
          >
            {isUpdatingState ? <LoadingSpinner size="sm" /> : "Reopen Issue"}
          </Button>
        ) : (
          <Button
            variant="outlined"
            size="sm"
            onClick={() => handleUpdateIssueState("closed")}
            disabled={isUpdatingState}
            className="text-xs"
          >
            {isUpdatingState ? <LoadingSpinner size="sm" /> : "Close Issue"}
          </Button>
        )}
      </div>
    );
  }

  // Otherwise, show the "Connect to GitHub" button
  return (
    <>
      <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={() => setIsOpen(true)}>
        <GitHubSvg className="h-4 w-4 object-contain" />
        Connect to GitHub
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (open && activeTab === "link") {
            refetchIssues();
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>GitHub Integration</DialogTitle>
            <DialogDescription>
              Connect this conversation with GitHub repository: {mailbox.githubRepoOwner}/{mailbox.githubRepoName}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create New Issue</TabsTrigger>
              <TabsTrigger value="link">Link Existing Issue</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="mt-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Issue title"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="body">Description</Label>
                  <Textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Issue description"
                    rows={6}
                  />
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outlined" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateIssue} disabled={isCreating || !title}>
                  {isCreating ? "Creating..." : "Create Issue"}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="link" className="mt-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="issue">Select an existing issue</Label>
                  {isLoadingIssues ? (
                    <div className="flex items-center justify-center py-4">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : issues && issues.length > 0 ? (
                    <Select onValueChange={(value) => setSelectedIssueNumber(Number(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an issue" />
                      </SelectTrigger>
                      <SelectContent>
                        {issues.map((issue: GitHubIssue) => (
                          <SelectItem key={issue.number} value={issue.number.toString()}>
                            #{issue.number} - {issue.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm text-muted-foreground py-2">No open issues found in this repository.</div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Only showing open issues. Make sure issues are enabled in your repository settings.
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outlined" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleLinkIssue} disabled={isLinking || !selectedIssueNumber || isLoadingIssues}>
                  {isLinking ? "Linking..." : "Link Issue"}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};
