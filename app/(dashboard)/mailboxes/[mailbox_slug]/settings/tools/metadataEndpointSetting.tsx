"use client";

import cx from "classnames";
import { ExternalLink, PlusCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { MetadataEndpoint } from "@/app/types/global";
import { ConfirmationDialog } from "@/components/confirmationDialog";
import { getMarketingSiteUrl } from "@/components/constants";
import { SecretInput } from "@/components/secretInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";

type MetadataEndpointSettingProps = {
  metadataEndpoint: MetadataEndpoint | null;
};

const MetadataEndpointSetting = ({ metadataEndpoint }: MetadataEndpointSettingProps) => {
  const params = useParams();
  const router = useRouter();
  const mailboxSlug = params.mailbox_slug as string;

  const inputRef = useRef<HTMLInputElement>(null);
  const [newUrl, setNewUrl] = useState(metadataEndpoint?.url || "");
  const [isLoading, setIsLoading] = useState(false);

  const { mutateAsync: createEndpointMutation } = api.mailbox.metadataEndpoint.create.useMutation();
  const { mutateAsync: deleteEndpointMutation } = api.mailbox.metadataEndpoint.delete.useMutation();
  const { refetch: testEndpointQuery } = api.mailbox.metadataEndpoint.test.useQuery(
    { mailboxSlug },
    { enabled: false },
  );

  const testRequestTexts = {
    idle: "Send test request to URL",
    loading: "Sending test request...",
    success: "Sent!",
    error: "Test request failed",
  };
  const [testRequestStatus, setTestRequestStatus] = useState<keyof typeof testRequestTexts>("idle");

  const addEndpoint = async () => {
    if (inputRef.current && !inputRef.current.checkValidity()) {
      inputRef.current.reportValidity();
      return;
    }
    if (!newUrl) return;

    setIsLoading(true);
    try {
      const result = await createEndpointMutation({ mailboxSlug, url: newUrl });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
      toast.success("Metadata endpoint added!");
    } catch (e) {
      captureExceptionAndLog(e);
      toast.error("Error adding metadata endpoint");
    } finally {
      setIsLoading(false);
    }
  };

  const removeEndpoint = async () => {
    setIsLoading(true);
    try {
      const result = await deleteEndpointMutation({ mailboxSlug });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setNewUrl("");
      router.refresh();
      toast.success("Metadata endpoint removed!");
    } catch (e) {
      captureExceptionAndLog(e);
      toast.error("Error removing metadata endpoint");
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestRequest = async () => {
    setTestRequestStatus("loading");
    try {
      const { data: result } = await testEndpointQuery();
      if (result?.error) {
        toast.error(result.error);
        setTestRequestStatus("error");
        return;
      }
      toast.success("Test request succeeded!");
      setTestRequestStatus("success");
    } catch (e) {
      captureExceptionAndLog(e);
      toast.error("Error sending test request");
      setTestRequestStatus("error");
    } finally {
      setTimeout(() => setTestRequestStatus("idle"), 3000);
    }
  };

  return (
    <SectionWrapper
      title="Metadata Endpoint"
      description={
        <>
          <span>Add an endpoint for Helper to fetch customer value and metadata when an email is received.</span>
          <a
            href={`${getMarketingSiteUrl()}/docs/tools/05-metadata-endpoint`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline flex items-center gap-1 mt-1"
          >
            Documentation
            <ExternalLink className="h-4 w-4" />
          </a>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="grid gap-1">
          <Label>URL</Label>
          <Input
            ref={inputRef}
            placeholder="Enter endpoint URL"
            type="url"
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addEndpoint();
              }
            }}
            value={newUrl}
            disabled={!!metadataEndpoint?.url}
            hint={
              metadataEndpoint?.url ? (
                <button
                  className={cx(
                    testRequestStatus === "idle" && "underline",
                    testRequestStatus === "error"
                      ? "text-destructive-500"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={sendTestRequest}
                  disabled={testRequestStatus !== "idle"}
                >
                  {testRequestTexts[testRequestStatus]}
                </button>
              ) : null
            }
          />
        </div>
        {metadataEndpoint?.url ? (
          <>
            <div className="grid gap-1">
              <Label>HMAC Secret</Label>
              <SecretInput value={metadataEndpoint.hmacSecret} ariaLabel="HMAC Secret" />
            </div>
            <div>
              <ConfirmationDialog
                message="Are you sure you want to remove this Metadata Endpoint?"
                onConfirm={removeEndpoint}
                confirmLabel="Yes, remove"
              >
                <Button variant="destructive_outlined" disabled={isLoading}>
                  Remove endpoint
                </Button>
              </ConfirmationDialog>
            </div>
          </>
        ) : (
          <div>
            <Button
              disabled={!newUrl || isLoading}
              variant="subtle"
              onClick={(e) => {
                e.preventDefault();
                addEndpoint();
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add endpoint
            </Button>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};

export default MetadataEndpointSetting;
