"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const SecretGenerator = () => {
  const [secret, setSecret] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return secret ? (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono">{secret}</span>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={handleCopy}>
              {copied ? <CheckIcon className="w-4 h-4 text-success" /> : <CopyIcon className="w-4 h-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "Copied!" : "Copy to clipboard"}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  ) : (
    <a className="cursor-pointer" onClick={() => setSecret(crypto.randomUUID().replace(/-/g, "").slice(0, 32))}>
      Generate a random secret
    </a>
  );
};
