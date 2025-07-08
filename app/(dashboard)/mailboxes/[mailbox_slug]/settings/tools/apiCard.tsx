"use client";

import { Check, RefreshCw, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/confirmationDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import ToolListItem from "./toolListItem";

const ApiCard = ({ api: apiData }: { api: RouterOutputs["mailbox"]["tools"]["list"][number] }) => {
  const utils = api.useUtils();
  const [isRefreshed, setIsRefreshed] = useState(false);
  const [isSchemaPopoverOpen, setIsSchemaPopoverOpen] = useState(false);
  const [schema, setSchema] = useState("");

  const { mutate: refreshApi, isPending: isRefreshing } = api.mailbox.tools.refreshApi.useMutation({
    onSuccess: () => {
      setIsRefreshed(true);
      setTimeout(() => setIsRefreshed(false), 3000);
      utils.mailbox.tools.list.invalidate();
      setIsSchemaPopoverOpen(false);
      setSchema("");
    },
    onError: (error) => {
      toast.error("Error refreshing API", { description: error.message });
    },
  });

  const { mutate: deleteApi, isPending: isDeleting } = api.mailbox.tools.deleteApi.useMutation({
    onSuccess: () => {
      utils.mailbox.tools.list.invalidate();
    },
    onError: (error) => {
      toast.error("Error deleting API", { description: error.message });
    },
  });

  const handleSchemaSubmit = () => {
    refreshApi({ apiId: apiData.id, schema });
  };

  const refreshButton = (ariaAttributes: React.AriaAttributes) => (
    <Button variant="ghost" size="sm" disabled={isRefreshing} {...ariaAttributes}>
      {isRefreshed ? (
        <Check className="h-4 w-4 mr-2" />
      ) : (
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
      )}
      {isRefreshed ? "Refreshed" : "Refresh"}
    </Button>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{apiData.name}</CardTitle>
            <div className="text-sm text-muted-foreground">{apiData.baseUrl ?? "OpenAPI schema"}</div>
          </div>
          <div className="flex gap-2">
            {!apiData.baseUrl ? (
              <Popover open={isSchemaPopoverOpen} onOpenChange={setIsSchemaPopoverOpen}>
                <PopoverTrigger asChild>{refreshButton({})}</PopoverTrigger>
                <PopoverContent className="min-w-[400px]">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="schema">Update OpenAPI Schema</Label>
                      <Textarea
                        id="schema"
                        value={schema}
                        onChange={(e) => setSchema(e.target.value)}
                        onModEnter={handleSchemaSubmit}
                        placeholder={`{
  "products": {
    "GET": {
      "url": "/products/:id",
      "description": "Retrieve the details of a product"
    }
  }
}`}
                        rows={10}
                        disabled={isRefreshing}
                        className="mt-2"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isRefreshing} onClick={handleSchemaSubmit}>
                        {isRefreshing ? "Updating..." : "Update Schema"}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshApi({ apiId: apiData.id })}
                disabled={isRefreshing}
              >
                {isRefreshed ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                )}
                {isRefreshed ? "Refreshed" : "Refresh"}
              </Button>
            )}
            <ConfirmationDialog
              message="Are you sure you want to delete this API?"
              onConfirm={() => {
                deleteApi({ apiId: apiData.id });
              }}
              confirmLabel="Yes, delete"
            >
              <Button variant="ghost" size="sm" iconOnly disabled={isDeleting}>
                <Trash className="h-4 w-4" />
              </Button>
            </ConfirmationDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border">
          {apiData.tools.map((tool) => (
            <ToolListItem key={tool.id} tool={tool} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiCard;
