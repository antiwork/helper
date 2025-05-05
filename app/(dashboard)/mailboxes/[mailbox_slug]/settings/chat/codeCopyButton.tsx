"use client";

import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
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
      <button className="absolute right-2 top-2 flex items-center gap-1 rounded bg-muted px-3 py-2 text-xs text-muted-foreground hover:bg-border">
        {copied ? (
          "Copied!"
        ) : (
          <>
            <DocumentDuplicateIcon className="h-4 w-4 text-muted-foreground" />
            Copy
          </>
        )}
      </button>
    </CopyToClipboard>
  );
};

export default CopyButton;
