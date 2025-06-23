"use client";

import { Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SecretInputProps {
  value: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function SecretInput({ value, ariaLabel = "Secret", disabled = true, className }: SecretInputProps) {
  const [showSecret, setShowSecret] = useState(false);
  const [copyTooltip, setCopyTooltip] = useState({ open: false, content: "" });

  return (
    <Input
      type={showSecret ? "text" : "password"}
      value={value}
      aria-label={ariaLabel}
      disabled={disabled}
      className={className}
      iconsSuffix={
        <>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="flex items-center gap-1"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowSecret(!showSecret);
                  }}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>{showSecret ? "Hide" : "Show"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <CopyToClipboard
            text={value}
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
                      <Copy className="h-4 w-4 text-muted-foreground" />
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
  );
}
