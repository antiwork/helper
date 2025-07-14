import { useRouter } from "next/navigation";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import GitHubSvg from "@/app/(dashboard)/icons/github.svg";
import { ConfirmationDialog } from "@/components/confirmationDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRunOnce } from "@/components/useRunOnce";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";

const GitHubRepositories = ({
  id,
  selectedRepoFullName,
  mailbox,
}: {
  id: string;
  selectedRepoFullName?: string;
  mailbox: RouterOutputs["mailbox"]["get"];
}) => {
  const utils = api.useUtils();
  const [repositories, setRepositories] = useState<{ id: number; name: string; fullName: string; owner: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { mutate: update } = api.mailbox.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate();
    },
    onError: (error) => {
      toast.error("Error updating GitHub settings", {
        description: error.message,
      });
    },
  });

  useRunOnce(() => {
    const fetchRepositories = async () => {
      try {
        setIsLoading(true);
        setRepositories(await utils.client.mailbox.github.repositories.query());
      } catch (e) {
        captureExceptionAndLog(e);
        toast.error("Error fetching available repositories");
      } finally {
        setIsLoading(false);
      }
    };

    if (mailbox.githubConnected) {
      fetchRepositories();
    } else {
      setIsLoading(false);
    }
  });

  const handleRepoChange = (fullName: string) => {
    const [repoOwner, repoName] = fullName.split("/");
    update({ githubRepoOwner: repoOwner, githubRepoName: repoName });
  };

  return (
    <Select disabled={isLoading || !repositories.length} value={selectedRepoFullName} onValueChange={handleRepoChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={isLoading ? "Loading repositories..." : "Select a repository"} />
      </SelectTrigger>
      <SelectContent>
        {repositories.map((repo) => (
          <SelectItem key={repo.id} value={repo.fullName}>
            {repo.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const GitHubSetting = ({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) => {
  const router = useRouter();
  const { mutateAsync: disconnectGitHub } = api.mailbox.github.disconnect.useMutation();
  const [isGitHubConnected, setGitHubConnected] = useState(mailbox.githubConnected);
  const repoUID = useId();
  const [githubConnectResult, setGithubConnectResult] = useQueryState(
    "githubConnectResult",
    parseAsStringEnum(["success", "error"] as const),
  );

  useEffect(() => {
    if (githubConnectResult === "success") {
      toast.success("GitHub connected successfully");
      setGithubConnectResult(null);
    } else if (githubConnectResult === "error") {
      toast.error("Failed to connect GitHub");
      setGithubConnectResult(null);
    }
  }, [githubConnectResult, router, setGithubConnectResult]);

  const onDisconnectGitHub = async () => {
    try {
      await disconnectGitHub();
      setGitHubConnected(false);
      toast.success("GitHub disconnected successfully");
    } catch (e) {
      captureExceptionAndLog(e);
      toast.error("Error disconnecting GitHub");
    }
  };

  const selectedRepoFullName =
    mailbox.githubRepoOwner && mailbox.githubRepoName
      ? `${mailbox.githubRepoOwner}/${mailbox.githubRepoName}`
      : undefined;

  const connectUrl = mailbox.githubConnectUrl;
  if (!connectUrl) return null;

  return (
    <SectionWrapper title="GitHub Integration" description="Create and track GitHub issues from conversations.">
      {isGitHubConnected ? (
        <>
          <div className="grid gap-1">
            <Label htmlFor={repoUID}>Repository</Label>
            <GitHubRepositories id={repoUID} selectedRepoFullName={selectedRepoFullName} mailbox={mailbox} />
            <p className="mt-2 text-sm text-muted-foreground">
              Select a single repository where issues will be created. Only one repository can be linked per mailbox.
              {selectedRepoFullName && (
                <>
                  <br />
                  <span className="font-medium">Important:</span> Make sure issues are enabled in your repository
                  settings. <br />
                  (scroll down to the "Features" section to see issues box)
                </>
              )}
            </p>
            {selectedRepoFullName && (
              <div className="mt-2">
                <a
                  href={`https://github.com/${selectedRepoFullName}/settings`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Check repository settings →
                </a>
              </div>
            )}
          </div>
          <div className="mt-4">
            <ConfirmationDialog
              message="Are you sure you want to disconnect GitHub? This will remove the repository link and disable GitHub issue creation."
              onConfirm={() => {
                onDisconnectGitHub();
              }}
              confirmLabel="Yes, disconnect"
            >
              <Button variant="destructive_outlined">Disconnect from GitHub</Button>
            </ConfirmationDialog>
          </div>
        </>
      ) : (
        <Button onClick={() => router.push(connectUrl)} variant="subtle">
          <GitHubSvg className="mr-2 h-4 w-4" />
          Connect to GitHub
        </Button>
      )}
    </SectionWrapper>
  );
};

export default GitHubSetting;
