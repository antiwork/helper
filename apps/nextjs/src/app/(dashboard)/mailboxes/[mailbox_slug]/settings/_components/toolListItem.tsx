"use client";

import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/trpc/react";
import type { ToolFormatted } from "@/types/tools";

const ToolListItem = ({ tool, mailboxSlug }: { tool: ToolFormatted; mailboxSlug: string }) => {
  const [editingTool, setEditingTool] = useState<ToolFormatted | null>(null);
  const utils = api.useUtils();

  const updateToolMutation = api.mailbox.tools.update.useMutation({
    onMutate: ({ toolId, settings: { enabled, availableInChat } }) => {
      utils.mailbox.tools.list.setData({ mailboxSlug }, (currentApis = []) =>
        currentApis.map((api) => ({
          ...api,
          tools: api.tools.map((t) => (t.id === toolId ? { ...t, enabled, availableInChat } : t)),
        })),
      );
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error updating tool", description: error.message });
    },
  });

  const handleToolToggle = async (enabled: boolean) => {
    await updateToolMutation.mutateAsync({
      mailboxSlug,
      toolId: tool.id,
      settings: {
        enabled,
        availableInChat: tool.availableInChat,
      },
    });
  };

  return editingTool ? (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await updateToolMutation.mutateAsync({
          mailboxSlug,
          toolId: editingTool.id,
          settings: {
            enabled: editingTool.enabled,
            availableInChat: editingTool.availableInChat,
          },
        });

        setEditingTool(null);
      }}
    >
      <div className="border rounded-lg p-4 my-4 grid gap-4">
        <div>
          <Label>Name</Label>
          <div className="text-sm">{editingTool.name}</div>
        </div>
        <div>
          <Label>Description</Label>
          <div className="text-sm">{editingTool.description}</div>
        </div>
        <div>
          <Label>Endpoint</Label>
          <div className="flex items-center gap-2">
            <Badge variant="default">{editingTool.requestMethod}</Badge>
            <div className="w-full p-2 bg-muted rounded-md font-mono text-sm break-all">{editingTool.url}</div>
          </div>
        </div>
        {editingTool.parameters && (
          <div>
            <Label>Parameters</Label>
            <div className="mt-1.5 space-y-2">
              {editingTool.parameters.map((param) => (
                <div key={param.name} className="flex items-center gap-2">
                  <div className="font-mono text-sm">{param.name}</div>
                  <Badge variant="default">{param.type}</Badge>
                  {param.required && <Badge variant="default">required</Badge>}
                  {param.description && <div className="text-xs text-muted-foreground">{param.description}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-1.5 space-y-4">
          <div className="flex items-start justify-between gap-8">
            <div>
              <div>Enable Tool</div>
              <div className="text-sm text-muted-foreground">Allow this tool to be used in the mailbox</div>
            </div>
            <Switch
              id="enable-tool"
              aria-label="Enable tool"
              checked={editingTool.enabled}
              onCheckedChange={(checked) => setEditingTool((tool) => (tool ? { ...tool, enabled: checked } : tool))}
              disabled={updateToolMutation.isPending}
            />
          </div>
          <div className="flex items-start justify-between gap-8">
            <div>
              <div>Available in Chat</div>
              <div className="text-sm text-muted-foreground">
                Allow this tool to be used by customers in chat conversations
              </div>
            </div>
            <Switch
              id="available-in-chat"
              aria-label="Make available in chat"
              checked={editingTool.availableInChat}
              onCheckedChange={(checked) =>
                setEditingTool((tool) => (tool ? { ...tool, availableInChat: checked } : tool))
              }
              disabled={updateToolMutation.isPending || !editingTool.enabled}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setEditingTool(null)}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateToolMutation.isPending}>
            {updateToolMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </form>
  ) : (
    <div className="flex items-center gap-4 py-4">
      <Switch checked={tool.enabled} onCheckedChange={handleToolToggle} disabled={updateToolMutation.isPending} />
      <div
        className="flex-1 min-w-0 text-left flex items-center cursor-pointer"
        onClick={() => setEditingTool({ ...tool })}
      >
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm">{tool.name}</div>
          <div className="text-xs truncate text-muted-foreground">/{tool.path}</div>
        </div>
        <Badge variant="default">{tool.requestMethod}</Badge>
        <Cog6ToothIcon className="h-4 w-4 ml-4 text-muted-foreground" />
      </div>
    </div>
  );
};

export default ToolListItem;
