import { Camera, Mic } from "lucide-react";
import * as motion from "motion/react-client";
import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/hooks/use-toast";
import ShadowHoverButton from "@/components/widget/ShadowHoverButton";
import { useScreenshotStore } from "@/components/widget/widgetState";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { sendScreenshot } from "@/lib/widget/messages";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  input: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (screenshotData?: string) => void;
  isLoading: boolean;
  isGumroadTheme: boolean;
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
}: Props) {
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const { screenshot, setScreenshot } = useScreenshotStore();
  const { isSupported, isRecording, transcript, error, startRecording, stopRecording } = useSpeechRecognition();
  const prevTranscript = useRef(transcript);

  useEffect(() => {
    if (!input) {
      setShowScreenshot(false);
      setIncludeScreenshot(false);
    } else if (SCREENSHOT_KEYWORDS.some((keyword) => input.toLowerCase().includes(keyword))) {
      setShowScreenshot(true);
    }
  }, [input]);

  useEffect(() => {
    if (screenshot?.response) {
      handleSubmit(screenshot.response);
      setScreenshot(null);
    }
  }, [screenshot]);

  useEffect(() => {
    // handleInputChange updates each render, so we need to check if the transcript has changed
    if (transcript && transcript !== prevTranscript.current) {
      const event = {
        target: { value: transcript },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      handleInputChange(event);

      if (inputRef.current) {
        inputRef.current.focus();
      }
    }

    prevTranscript.current = transcript;
  }, [transcript, handleInputChange, inputRef]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
      });
    }
  }, [error]);

  const submit = () => {
    if (includeScreenshot) {
      sendScreenshot();
    } else {
      handleSubmit();
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
    <div className="h-16 border-t border-black p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-2"
      >
        <div className="flex-1 flex items-start">
          <Textarea
            aria-label="Ask a question"
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask a question"
            className="self-stretch max-w-md placeholder:text-muted-foreground text-foreground flex-1 resize-none border-none bg-transparent p-0 outline-hidden focus:border-none focus:outline-hidden focus:ring-0"
            disabled={isLoading}
          />
          <div className="flex items-center gap-2">
            {isSupported && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={cn(
                        "text-primary hover:text-muted-foreground p-2 rounded-full hover:bg-muted focus:outline-none",
                        {
                          "bg-muted": isRecording,
                        }
                      )}
                      disabled={isLoading}
                      aria-label={isRecording ? "Stop recording" : "Start recording"}
                    >
                      <Mic
                        className={cn("w-4 h-4", {
                          "text-red-500": isRecording,
                          "text-primary": !isRecording,
                        })}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{isRecording ? "Stop recording" : "Start recording"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <ShadowHoverButton isLoading={isLoading} isGumroadTheme={isGumroadTheme} />
          </div>
        </div>
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
