"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";

const CopyButton = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <CopyToClipboard text={code} onCopy={handleCopy}>
      <button className="absolute right-2 top-2 flex items-center gap-1 rounded bg-muted p-2 text-xs hover:bg-border">
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4 text-muted-foreground" />}
      </button>
    </CopyToClipboard>
  );
};

export default CopyButton;
