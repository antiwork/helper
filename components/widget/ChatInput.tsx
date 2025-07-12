import { Camera, Mic, Paperclip } from "lucide-react";
import * as motion from "motion/react-client";
import { useCallback, useEffect, useState } from "react";
import { useSpeechRecognition } from "@/components/hooks/useSpeechRecognition";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ShadowHoverButton from "@/components/widget/ShadowHoverButton";
import { useScreenshotStore } from "@/components/widget/widgetState";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { cn } from "@/lib/utils";
import { closeWidget, sendScreenshot } from "@/lib/widget/messages";

type Props = {
  input: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (screenshotData?: string, attachments?: File[]) => void;
  isLoading: boolean;
  isGumroadTheme: boolean;
  placeholder?: string;
};

const SCREENSHOT_KEYWORDS = [
  "error",
  "I can't",
  "wrong",
  "trouble",
  "problem",
  "issue",
  "glitch",
  "bug",
  "broken",
  "doesn't work",
  "doesn't load",
  "not loading",
  "crash",
  "stuck",
  "fails",
  "failure",
  "failed",
  "missing",
  "can't find",
  "can't see",
  "doesn't show",
  "not showing",
  "not working",
  "incorrect",
  "unexpected",
  "strange",
  "weird",
  "help me",
  "confused",
  "404",
  "500",
  "not responding",
  "slow",
  "hangs",
  "screenshot",
];

export default function ChatInput({
  input,
  inputRef,
  handleInputChange,
  handleSubmit,
  isLoading,
  isGumroadTheme,
  placeholder,
}: Props) {
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const { screenshot, setScreenshot } = useScreenshotStore();

  // File size limit: 25MB (to match existing limits)
  const MAX_FILE_SIZE = 25 * 1024 * 1024;

  const handleSegment = useCallback(
    (segment: string) => {
      const currentInput = inputRef.current?.value || "";

      const event = {
        target: { value: currentInput + segment },
      } as React.ChangeEvent<HTMLTextAreaElement>;

      handleInputChange(event);

      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      });
    },
    [handleInputChange, inputRef],
  );

  const handleError = useCallback((error: string) => {
    captureExceptionAndLog(new Error(`Speech recognition error: ${error}`));
  }, []);

  const { isSupported, isRecording, startRecording, stopRecording } = useSpeechRecognition({
    onSegment: handleSegment,
    onError: handleError,
  });

  const adjustTextareaHeight = () => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  useEffect(() => {
    if (!input) {
      setShowScreenshot(false);
      setIncludeScreenshot(false);
      setSelectedFiles([]);
    } else if (SCREENSHOT_KEYWORDS.some((keyword) => input.toLowerCase().includes(keyword))) {
      setShowScreenshot(true);
    }
  }, [input]);

  useEffect(() => {
    if (screenshot?.response) {
      // Get any pending attachments that were selected before screenshot
      const pendingAttachments = (window as any).pendingAttachments || [];
      (window as any).pendingAttachments = undefined;

      handleSubmit(screenshot.response, pendingAttachments.length > 0 ? pendingAttachments : undefined);
      setScreenshot(null);
    }
  }, [screenshot]);

  const validateAndFilterFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      if (!file.type.startsWith("image/")) {
        errors.push(`${file.name}: Only image files are supported`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds limit (25MB)`);
        continue;
      }

      validFiles.push(file);
    }

    if (errors.length > 0) {
      setFileError(errors.join(", "));
      // Clear error after 5 seconds
      setTimeout(() => setFileError(null), 5000);
    } else {
      setFileError(null);
    }

    return validFiles;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const validFiles = validateAndFilterFiles(files);
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = validateAndFilterFiles(files);
    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const submit = () => {
    const normalizedInput = input.trim().toLowerCase();
    if (
      ["exit", "cancel", "close", "stop", "quit", "end", "bye"].some((cmd) => normalizedInput === cmd) ||
      normalizedInput.includes("exit chat") ||
      normalizedInput.includes("exit this chat") ||
      normalizedInput.includes("close this chat") ||
      normalizedInput.includes("close chat")
    ) {
      closeWidget();
      return;
    }
    if (includeScreenshot) {
      // Store selected files in a temporary state that can be accessed after screenshot
      if (selectedFiles.length > 0) {
        (window as any).pendingAttachments = selectedFiles;
      }
      sendScreenshot();
    } else {
      handleSubmit(undefined, selectedFiles.length > 0 ? selectedFiles : undefined);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div
      className={cn("border-t border-black p-4 bg-white", {
        "bg-blue-50": isDragOver,
      })}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          stopRecording();
          submit();
        }}
        className="flex flex-col gap-2"
      >
        <div className="flex-1 flex items-start">
          <Textarea
            aria-label="Ask a question"
            ref={inputRef}
            value={input}
            onChange={(e) => {
              handleInputChange(e);
              adjustTextareaHeight();
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder}
            className="self-stretch max-w-md placeholder:text-muted-foreground text-foreground flex-1 resize-none border-none bg-white p-0 pr-3 outline-none focus:border-none focus:outline-none focus:ring-0 min-h-[24px] max-h-[200px]"
            disabled={isLoading}
          />
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label
                    className="text-primary hover:text-muted-foreground p-2 rounded-full hover:bg-muted cursor-pointer"
                    aria-label="Attach images"
                  >
                    <Paperclip className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={isLoading}
                    />
                  </label>
                </TooltipTrigger>
                <TooltipContent>Attach images</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {isSupported && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={cn("text-primary hover:text-muted-foreground p-2 rounded-full hover:bg-muted", {
                        "bg-muted": isRecording,
                      })}
                      disabled={isLoading}
                      aria-label={isRecording ? "Stop" : "Dictate"}
                    >
                      <Mic
                        className={cn("w-4 h-4", {
                          "text-red-500": isRecording,
                          "text-primary": !isRecording,
                        })}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{isRecording ? "Stop" : "Dictate"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <ShadowHoverButton isLoading={isLoading} isGumroadTheme={isGumroadTheme} />
          </div>
        </div>
        {fileError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{
              type: "spring",
              stiffness: 600,
              damping: 30,
            }}
            className="bg-red-50 border border-red-200 rounded-lg p-2"
          >
            <div className="text-sm text-red-600">{fileError}</div>
          </motion.div>
        )}
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{
              type: "spring",
              stiffness: 600,
              damping: 30,
            }}
            className="flex flex-wrap gap-2"
          >
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative bg-muted rounded-lg p-2 flex items-center gap-2">
                <div className="text-sm text-muted-foreground">{file.name}</div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${file.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </motion.div>
        )}
        {showScreenshot && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{
              type: "spring",
              stiffness: 600,
              damping: 30,
            }}
            className="flex items-center gap-2"
          >
            <Checkbox
              id="screenshot"
              checked={includeScreenshot}
              onCheckedChange={(e) => setIncludeScreenshot(e === true)}
              className="border-muted-foreground data-[state=checked]:bg-black data-[state=checked]:text-white"
            />
            <label
              htmlFor="screenshot"
              className="cursor-pointer flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Camera className="w-4 h-4" />
              Include a screenshot for better support?
            </label>
          </motion.div>
        )}
      </form>
    </div>
  );
}
