"use client";

import { DocumentDuplicateIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const WidgetHMACSecret = ({ hmacSecret }: { hmacSecret: string }) => {
  const [showSecret, setShowSecret] = useState(false);
  const [copyTooltip, setCopyTooltip] = useState({ open: false, content: "" });

  return (
    <div>
      <Input
        type={showSecret ? "text" : "password"}
        value={hmacSecret}
        aria-label="HMAC Secret"
        disabled
        iconsSuffix={
          <>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="flex items-center gap-1"
                    onClick={(e) => {
                      e.preventDefault();
                      setTimeout(() => {
                        setShowSecret(!showSecret);
                      }, 100);
                    }}
                  >
                    {showSecret ? (
                      <EyeSlashIcon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{showSecret ? "Hide" : "Show"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <CopyToClipboard
              text={hmacSecret}
              onCopy={() => {
                setCopyTooltip((copyTooltip) => ({ ...copyTooltip, content: "Copied!" }));
                setTimeout(() => {
                  setCopyTooltip((copyTooltip) => ({ ...copyTooltip, content: "" }));
                }, 1000);
              }}
            >
              <span>
                <TooltipProvider delayDuration={0}>
                  <Tooltip
                    open={copyTooltip.open || !!copyTooltip.content}
                    onOpenChange={(open) => setCopyTooltip({ ...copyTooltip, open })}
                  >
                    <TooltipTrigger asChild>
                      <button
                        className="text-primary flex cursor-pointer items-center gap-1"
                        onClick={(e) => e.preventDefault()}
                      >
                        <DocumentDuplicateIcon className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{copyTooltip.content || "Copy"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
            </CopyToClipboard>
          </>
        }
      />
    </div>
  );
};

export default WidgetHMACSecret;
