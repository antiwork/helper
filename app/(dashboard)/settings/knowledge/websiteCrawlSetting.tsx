"use client";

import { format } from "date-fns";
import { Clock, PlusCircle, RefreshCw, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/confirmationDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const WebsiteCrawlSetting = () => {
  const [showAddWebsite, setShowAddWebsite] = useState(false);
  const [newWebsite, setNewWebsite] = useState({ name: "", url: "" });
  const [urlError, setUrlError] = useState("");
  const utils = api.useUtils();

  const { data: websites = [], isLoading: isLoadingWebsites } = api.mailbox.websites.list.useQuery();

  const addWebsiteMutation = api.mailbox.websites.create.useMutation({
    onSuccess: () => {
      toast.success("Website added!");
      utils.mailbox.websites.list.invalidate();
      setShowAddWebsite(false);
      setNewWebsite({ name: "", url: "" });
    },
    onError: (error) => {
      toast.error("Error adding website", { description: error.message });
    },
  });

  const deleteWebsiteMutation = api.mailbox.websites.delete.useMutation({
    onSuccess: () => {
      toast.success("Website deleted!");
      utils.mailbox.websites.list.invalidate();
    },
    onError: (error) => {
      toast.error("Error deleting website", { description: error.message });
    },
  });

  const triggerCrawlMutation = api.mailbox.websites.triggerCrawl.useMutation({
    onSuccess: () => {
      toast.success("Website scan started!", {
        description: "The scan will run in the background. Check back later for results.",
      });
      utils.mailbox.websites.list.invalidate();
    },
    onError: (error) => {
      toast.error("Error starting website scan", { description: error.message });
    },
  });

  const handleAddWebsite = (url: string) => {
    return addWebsiteMutation.mutateAsync({
      url,
    });
  };

  const handleDeleteWebsite = async (websiteId: number) => {
    await deleteWebsiteMutation.mutateAsync({
      websiteId,
    });
  };

  const handleTriggerCrawl = async (websiteId: number) => {
    await triggerCrawlMutation.mutateAsync({
      websiteId,
    });
  };

  const getStatusBadgeColor = (status: string) => {
    const baseClasses = "rounded-full px-2 py-1 text-xs font-medium";
    const statusMap = {
      completed: {
        classes: `${baseClasses} bg-green-100 text-green-800`,
        label: "Updated",
      },
      failed: {
        classes: `${baseClasses} bg-red-100 text-red-800`,
        label: "Failed",
      },
      loading: {
        classes: `${baseClasses} bg-blue-100 text-blue-800`,
        label: "Updating",
      },
      pending: {
        classes: `${baseClasses} bg-yellow-100 text-yellow-800`,
        label: "Pending",
      },
    };

    return (
      statusMap[status as keyof typeof statusMap] ?? {
        classes: `${baseClasses} bg-gray-100 text-gray-800`,
        label: status,
      }
    );
  };

  return (
    <>
      <SectionWrapper
        title="Website Learning"
        description={
          <>
            <div className="mb-2">
              Helper will learn about your product by reading your websites to provide better responses.
            </div>
            <div>Content is automatically updated weekly, but you can also update it manually.</div>
          </>
        }
      >
        <div role="list" className="space-y-4">
          {isLoadingWebsites ? (
            <>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-4">
                  <div className="grow space-y-2">
                    <div className="h-4 w-32 rounded bg-secondary animate-skeleton" />
                    <div className="h-4 w-48 rounded bg-secondary animate-skeleton" />
                  </div>
                  <div className="h-6 w-16 rounded bg-secondary animate-skeleton" />
                </div>
              ))}
            </>
          ) : (
            websites.map((website) => {
              const latestCrawl = website.latestCrawl;

              return (
                <div
                  key={website.id}
                  className="group relative flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50"
                  role="listitem"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium truncate">{website.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {website.pagesCount > 0 && (
                          <span className="rounded-full bg-secondary px-2 py-0.5">{website.pagesCount} pages</span>
                        )}
                      </div>
                    </div>
                    <a
                      href={website.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary truncate block"
                    >
                      {website.url}
                    </a>
                    {latestCrawl && (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className={getStatusBadgeColor(latestCrawl.status).classes}>
                          {getStatusBadgeColor(latestCrawl.status).label}
                        </span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(latestCrawl.startedAt), "MMM d, yyyy HH:mm")}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTriggerCrawl(website.id)}
                      disabled={triggerCrawlMutation.isPending || latestCrawl?.status === "loading"}
                    >
                      <RefreshCw
                        className={`mr-2 h-4 w-4 ${latestCrawl?.status === "loading" ? "animate-spin" : ""}`}
                      />
                      {triggerCrawlMutation.isPending ? "Updating..." : "Update"}
                    </Button>
                    <ConfirmationDialog
                      message="Are you sure you want to delete this website? All scanned pages will be deleted."
                      onConfirm={() => {
                        handleDeleteWebsite(website.id);
                      }}
                    >
                      <Button variant="ghost" size="sm" disabled={deleteWebsiteMutation.isPending}>
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </ConfirmationDialog>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="mt-4">
          {showAddWebsite ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();

                const urlWithProtocol = /^https?:\/\//i.test(newWebsite.url)
                  ? newWebsite.url
                  : `https://${newWebsite.url}`;

                if (!isValidUrl(urlWithProtocol)) {
                  setUrlError("Please enter a valid URL");
                  return;
                }
                setUrlError("");

                try {
                  await handleAddWebsite(urlWithProtocol);
                  setNewWebsite({ name: "", url: "" });
                  setShowAddWebsite(false);
                } catch (error) {
                  captureExceptionAndLog(error);
                  setUrlError("Failed to add website. Please try again.");
                }
              }}
            >
              <div className="border rounded-lg p-4 grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    placeholder="https://example.com"
                    value={newWebsite.url}
                    onChange={(e) => {
                      setNewWebsite({ ...newWebsite, name: "", url: e.target.value });
                      setUrlError("");
                    }}
                    autoFocus
                  />
                  {urlError && <div className="text-sm text-destructive">{urlError}</div>}
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setShowAddWebsite(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addWebsiteMutation.isPending}>
                    {addWebsiteMutation.isPending ? "Adding..." : "Add website"}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <Button variant="subtle" onClick={() => setShowAddWebsite(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add website
            </Button>
          )}
        </div>
      </SectionWrapper>
    </>
  );
};

export default WebsiteCrawlSetting;
