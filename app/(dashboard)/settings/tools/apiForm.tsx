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
  "data-testid"?: string;
};

const ApiForm = ({ onCancel, "data-testid": testId }: ApiFormProps) => {
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
    <div className="rounded-lg border border-border p-4 space-y-4" data-testid={testId}>
      <div>
        <Label htmlFor="apiName">Name</Label>
        <Input
          id="apiName"
          value={apiName}
          onChange={(e) => setApiName(e.target.value)}
          placeholder="Your App"
          disabled={importMutation.isPending}
          data-testid="api-name-input"
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
                <button className="underline" onClick={toggleInputType} data-testid="toggle-schema-button">
                  Enter OpenAPI schema instead
                </button>
              }
              disabled={importMutation.isPending}
              data-testid="api-url-input"
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
              data-testid="api-schema-textarea"
            />
            <button
              className="underline text-sm"
              onClick={toggleInputType}
              disabled={importMutation.isPending}
              data-testid="toggle-url-button"
            >
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
          data-testid="api-key-input"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={importMutation.isPending} data-testid="cancel-button">
          Cancel
        </Button>
        <Button
          variant="bright"
          onClick={handleImport}
          disabled={importMutation.isPending}
          data-testid="import-api-button"
        >
          {importMutation.isPending ? "Importing API..." : "Import API"}
        </Button>
      </div>
    </div>
  );
};

export default ApiForm;
