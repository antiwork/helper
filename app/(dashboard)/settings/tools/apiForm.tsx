"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

type ApiFormProps = {
  onCancel: () => void;
};

const ApiForm = ({ onCancel }: ApiFormProps) => {
  const [isUrlInput, setIsUrlInput] = useState(true);
  const [apiUrl, setApiUrl] = useState("");
  const [apiSchema, setApiSchema] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiName, setApiName] = useState("");

  const utils = api.useUtils();

  const importMutation = api.mailbox.tools.import.useMutation({
    onSuccess: () => {
      toast.success("API imported successfully");
      utils.mailbox.tools.list.invalidate();
      onCancel();
    },
    onError: (error) => {
      toast.error("Failed to import API", { description: error.message });
    },
  });

  const toggleInputType = () => {
    setIsUrlInput(!isUrlInput);
  };

  const handleImport = async () => {
    if (!apiKey) {
      toast.error("API key is required");
      return;
    }

    if (!apiName) {
      toast.error("API name is required");
      return;
    }

    await importMutation.mutateAsync({
      url: isUrlInput ? apiUrl : undefined,
      schema: !isUrlInput ? apiSchema : undefined,
      apiKey,
      name: apiName,
    });
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <div>
        <Label htmlFor="apiName">Name</Label>
        <Input
          id="apiName"
          value={apiName}
          onChange={(e) => setApiName(e.target.value)}
          placeholder="Your App"
          disabled={importMutation.isPending}
        />
      </div>
      <div>
        {isUrlInput ? (
          <>
            <Label htmlFor="apiUrl">OpenAPI URL</Label>
            <Input
              id="apiUrl"
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://yourapp.com/api"
              hint={
                <button className="underline" onClick={toggleInputType}>
                  Enter OpenAPI schema instead
                </button>
              }
              disabled={importMutation.isPending}
            />
          </>
        ) : (
          <>
            <Label htmlFor="apiSchema">API schema</Label>
            <Textarea
              id="apiSchema"
              value={apiSchema}
              onChange={(e) => setApiSchema(e.target.value)}
              placeholder={`{
  "products": {
    "GET": {
      "url": "/products/:id",
      "description": "Retrieve the details of a product"
    }
  }
}`}
              rows={10}
              disabled={importMutation.isPending}
            />
            <button className="underline text-sm" onClick={toggleInputType} disabled={importMutation.isPending}>
              Enter OpenAPI URL instead
            </button>
          </>
        )}
      </div>
      <div>
        <Label htmlFor="apiKey">API token</Label>
        <Input
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={importMutation.isPending}
          hint="This will be sent as a Bearer token in the Authorization header"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={importMutation.isPending}>
          Cancel
        </Button>
        <Button variant="bright" onClick={handleImport} disabled={importMutation.isPending}>
          {importMutation.isPending ? "Importing API..." : "Import API"}
        </Button>
      </div>
    </div>
  );
};

export default ApiForm;
