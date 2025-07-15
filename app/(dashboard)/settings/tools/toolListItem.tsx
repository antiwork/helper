"use client";

import { Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/trpc/react";
import type { ToolFormatted } from "@/types/tools";

const ToolListItem = ({ tool }: { tool: ToolFormatted }) => {
  const [editingTool, setEditingTool] = useState<ToolFormatted | null>(null);
  const utils = api.useUtils();

  const updateToolMutation = api.mailbox.tools.update.useMutation({
    onMutate: ({ toolId, settings }) => {
      utils.mailbox.tools.list.setData(undefined, (currentApis = []) =>
        currentApis.map((api) => ({
          ...api,
          tools: api.tools.map((t) => (t.id === toolId ? { ...t, ...settings } : t)),
        })),
      );
    },
    onError: (error) => {
      toast.error("Error updating tool", { description: error.message });
    },
  });

  const handleToolToggle = async (enabled: boolean) => {
    await updateToolMutation.mutateAsync({
      toolId: tool.id,
      settings: {
        enabled,
        availableInChat: tool.availableInChat,
        availableInAnonymousChat: tool.availableInAnonymousChat,
        customerEmailParameter: tool.customerEmailParameter,
      },
    });
  };

  return editingTool ? (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await updateToolMutation.mutateAsync({
          toolId: editingTool.id,
          settings: {
            enabled: editingTool.enabled,
            availableInChat: editingTool.availableInChat,
            availableInAnonymousChat: editingTool.availableInAnonymousChat,
            customerEmailParameter: editingTool.customerEmailParameter,
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
              <div className="text-sm">Enable Tool</div>
              <div className="text-xs text-muted-foreground">Allow this tool to be used in the mailbox</div>
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
              <div className="text-sm">Available in Chat</div>
              <div className="text-xs text-muted-foreground">
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
          <div className="flex items-start justify-between gap-8">
            <div>
              <div className="text-sm">Available in anonymous chats</div>
              <div className="text-xs text-muted-foreground">Customer email may not be verified</div>
            </div>
            <Switch
              id="available-in-anonymous-chat"
              aria-label="Make available in anonymous chats"
              checked={editingTool.availableInAnonymousChat}
              onCheckedChange={(checked) =>
                setEditingTool((tool) => (tool ? { ...tool, availableInAnonymousChat: checked } : tool))
              }
              disabled={updateToolMutation.isPending || !editingTool.enabled || !editingTool.availableInChat}
            />
          </div>
          {editingTool.availableInChat && editingTool.parameters && editingTool.parameters.length > 0 && (
            <div>
              <Label htmlFor="customer-email-parameter">Customer Email Parameter</Label>
              <Select
                value={editingTool.customerEmailParameter || ""}
                onValueChange={(value) =>
                  setEditingTool((tool) => (tool ? { ...tool, customerEmailParameter: value } : tool))
                }
                disabled={!editingTool.availableInChat}
              >
                <SelectTrigger id="customer-email-parameter">
                  <SelectValue placeholder="Select parameter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="(none)">(none)</SelectItem>
                  {editingTool.parameters
                    .filter((param) => param.type === "string")
                    .map((param) => (
                      <SelectItem key={param.name} value={param.name}>
                        {param.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground mt-1">
                In chat this parameter will always be set to the customer's email. For security, make sure to set this
                for any tools related to a customer's account.
              </div>
            </div>
          )}
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
        <Settings className="h-4 w-4 ml-4 text-muted-foreground" />
      </div>
    </div>
  );
};

export default ToolListItem;
