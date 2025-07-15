"use client";

import { format } from "date-fns";
import { Clock, Globe, PlusCircle, RefreshCw, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/confirmationDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { api } from "@/trpc/react";

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default function WebsiteCrawlSetting() {
  const [showAddWebsite, setShowAddWebsite] = useState(false);
  const [newWebsite, setNewWebsite] = useState({ name: "", url: "" });
  const [urlError, setUrlError] = useState("");
  const utils = api.useUtils();

  const { data: websites = [], isLoading: isLoadingWebsites } = api.mailbox.websites.list.useQuery();

  const addWebsiteMutation = api.mailbox.websites.create.useMutation({
    onSuccess: () => {
      toast.success("Website added successfully");
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
      toast.success("Website deleted successfully");
      utils.mailbox.websites.list.invalidate();
    },
    onError: (error) => {
      toast.error("Error deleting website", { description: error.message });
    },
  });

  const triggerCrawlMutation = api.mailbox.websites.triggerCrawl.useMutation({
    onSuccess: () => {
      toast.success("Website scan started", {
        description: "The scan will run in the background. Check back later for results.",
      });
      utils.mailbox.websites.list.invalidate();
    },
    onError: (error) => {
      toast.error("Error starting website scan", { description: error.message });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: "success", label: "Updated" },
      failed: { variant: "destructive", label: "Failed" },
      loading: { variant: "default", label: "Updating" },
      pending: { variant: "default", label: "Pending" },
    } as const;

    const config = statusConfig[status as keyof typeof statusConfig] ?? { variant: "default", label: status };

    return (
      <Badge variant={config.variant} className="h-6">
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Website Learning</CardTitle>
          <CardDescription>
            Helper will learn about your product by reading your websites to provide better responses.
            Content is automatically updated weekly, but you can also update it manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {isLoadingWebsites ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="h-5 w-40 rounded bg-muted" />
                          <div className="h-4 w-60 rounded bg-muted" />
                          <div className="h-4 w-32 rounded bg-muted" />
                        </div>
                        <div className="flex gap-2">
                          <div className="h-9 w-24 rounded bg-muted" />
                          <div className="h-9 w-9 rounded bg-muted" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {websites.map((website) => {
                  const latestCrawl = website.latestCrawl;

                  return (
                    <Card key={website.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0 space-y-3">
                            <div className="flex items-center gap-3">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <h3 className="text-sm font-medium truncate">{website.name}</h3>
                              {website.pagesCount > 0 && (
                                <Badge variant="default" className="h-6">
                                                                    {website.pagesCount} pages
                                </Badge>
                              )}
                            </div>
                            
                            <a
                              href={website.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-muted-foreground hover:text-primary truncate block transition-colors"
                            >
                              {website.url}
                            </a>

                            {latestCrawl && (
                              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                {getStatusBadge(latestCrawl.status)}
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-4 w-4" />
                                  {format(new Date(latestCrawl.startedAt), "MMM d, yyyy HH:mm")}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => triggerCrawlMutation.mutate({ websiteId: website.id })}
                              disabled={triggerCrawlMutation.isPending || latestCrawl?.status === "loading"}
                            >
                              <RefreshCw
                                className={`mr-2 h-4 w-4 ${latestCrawl?.status === "loading" ? "animate-spin" : ""}`}
                              />
                              {triggerCrawlMutation.isPending ? "Updating..." : "Update"}
                            </Button>

                            <ConfirmationDialog
                              message="Are you sure you want to delete this website? All scanned pages will be deleted."
                              onConfirm={() => deleteWebsiteMutation.mutate({ websiteId: website.id })}
                            >
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                disabled={deleteWebsiteMutation.isPending}
                              >
                                <Trash className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </ConfirmationDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {websites.length === 0 && !showAddWebsite && (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                      <Globe className="h-8 w-8 text-muted-foreground" />
                      <div className="space-y-1">
                        <h3 className="font-semibold">No websites added</h3>
                        <p className="text-sm text-muted-foreground">
                          Add your first website to help Helper learn about your product
                        </p>
                      </div>
                      <Button 
                        variant="outlined" 
                        onClick={() => setShowAddWebsite(true)}
                        className="mt-2"
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add your first website
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {showAddWebsite && (
              <Card>
                <CardContent className="p-6">
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
                      
                      try {
                        await addWebsiteMutation.mutateAsync({ url: urlWithProtocol });
                      } catch (error) {
                        captureExceptionAndLog(error);
                        setUrlError("Failed to add website. Please try again.");
                      }
                    }}
                  >
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="url" className="text-sm font-medium">
                          Website URL
                        </Label>
                        <div className="mt-1.5">
                          <Input
                            id="url"
                            placeholder="https://example.com"
                            value={newWebsite.url}
                            onChange={(e) => {
                              setNewWebsite({ ...newWebsite, name: "", url: e.target.value });
                              setUrlError("");
                            }}
                            autoFocus
                            className="max-w-md"
                          />
                          {urlError && (
                            <p className="mt-2 text-sm text-destructive">{urlError}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          onClick={() => setShowAddWebsite(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={addWebsiteMutation.isPending}
                        >
                          {addWebsiteMutation.isPending ? "Adding..." : "Add website"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {!showAddWebsite && websites.length > 0 && (
              <Button 
                variant="outlined" 
                onClick={() => setShowAddWebsite(true)}
                className="w-full sm:w-auto"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add another website
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
