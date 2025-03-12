import * as React from "react";
import "./promptInfo.css";
import { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { PlaintextContent } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/renderMessageBody";
import { toast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";



const textStyles = "responsive-break-words prose max-w-none text-sm";

const PromptItem = ({
  title,
  content,
  asHtml,
  ...props
}: {
  title?: string;
  asHtml?: boolean;
  content: string;
} & React.HTMLAttributes<HTMLElement>) => (
  <section className="flex flex-col gap-2" {...props}>
    {title && <h3 className="text-base">{title}</h3>}
    <div className="rounded-lg bg-secondary p-4 text-sm">
      {asHtml ? (
        <div className={textStyles} dangerouslySetInnerHTML={{ __html: content }} />
      ) : (
        <div className={textStyles}>
          <PlaintextContent text={content} />
        </div>
      )}
    </div>
  </section>
);

// These height values need to be in sync for proper scrolling
const MODAL_HEIGHT = "h-[calc(100vh-8rem)]";
const MAX_MODAL_HEIGHT = "max-h-[calc(100vh-8rem)]";

const WorkflowInfo = ({ workflow }: { workflow: any }) => (
  <>
    {workflow.prompt && <PromptItem title="If" content={workflow.prompt} />}
    {workflow.action && <PromptItem title="Then" content={workflow.action} />}
    {workflow.message && <PromptItem title="Message" content={workflow.message} asHtml />}
    <PromptItem title="Also run on follow-up replies" content={workflow.runOnReplies ? "True" : "False"} />
  </>
);

const PromptInfoModal = ({ entity }: { entity: any }) => {
  const responseTitle = "Response";
  const [copied, setCopied] = useState(false);
  const resetCopied = useDebouncedCallback(() => setCopied(false), 2000);
  const promptContent = entity.prompt;

  return (
    <div className={`grid w-full grid-cols-[276px_1fr] gap-6 px-6 ${MODAL_HEIGHT}`}>
      <div
        className="mt-6 flex max-h-[calc(100vh-11rem)] flex-col rounded-lg border border-border"
        aria-label={responseTitle}
      >
        <div className="flex flex-col gap-3 border-b border-border p-3">
          <div>
            <h3 className="text-base">{responseTitle}</h3>
            <div className="text-xs text-muted-foreground" aria-label="Workflow title">
              {entity.name || "(no name)"}
            </div>
          </div>
          <CopyToClipboard
            text={promptContent}
            onCopy={(_, success) => {
              if (!success) {
                toast({
                  variant: "destructive",
                  title: "Failed to copy to clipboard",
                });
                return;
              }
              setCopied(true);
              resetCopied();
            }}
          >
            <Button size="sm" disabled={copied}>
              {copied ? "Copied!" : "Copy prompt"}
            </Button>
          </CopyToClipboard>
        </div>
        <div className="responsive-break-words scrollbar-container overflow-y-auto whitespace-normal p-4 text-sm">
          <div
            dangerouslySetInnerHTML={{
              __html: entity.message || "(no message)",
            }}
          />
        </div>
      </div>
      <div className={`scrollbar-container mt-6 flex flex-col gap-6 overflow-y-auto pb-6 ${MAX_MODAL_HEIGHT}`}>
        <WorkflowInfo workflow={entity} />
      </div>
    </div>
  );
};

export default PromptInfoModal;
