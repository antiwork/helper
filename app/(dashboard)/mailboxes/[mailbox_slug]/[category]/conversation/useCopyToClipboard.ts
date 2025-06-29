import { useState } from "react";

export const useCopyToClipboard = () => {
    const COPY_FEEDBACK_DURATION = 2000; // Duration in milliseconds to show feedback after copying
    const [copied, setCopied] = useState(false);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
            return true;
        } catch (error) {
            console.error("Failed to copy to clipboard:", error);
            return false;
        }
    };

    return { copied, copyToClipboard };
};
