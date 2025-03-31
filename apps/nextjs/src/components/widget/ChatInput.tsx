import { Camera } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import ShadowHoverButton from "@/components/widget/ShadowHoverButton";

type Props = {
  input: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e?: { preventDefault: () => void }) => void;
  isLoading: boolean;
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
];

export default function ChatInput({ input, inputRef, handleInputChange, handleSubmit, isLoading }: Props) {
  const showScreenshot = SCREENSHOT_KEYWORDS.some((keyword) => input.toLowerCase().includes(keyword));

  return (
    <div className="h-24 border-t border-black p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex-1 flex items-start">
          <Textarea
            aria-label="Ask a question"
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask a question"
            className="self-stretch max-w-md placeholder:text-gray-700 text-black flex-1 resize-none border-none bg-transparent p-0 outline-none focus:border-none focus:outline-none focus:ring-0"
            disabled={isLoading}
          />
          <ShadowHoverButton isLoading={isLoading} />
        </div>
        {showScreenshot && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="screenshot"
              className="border-muted-foreground data-[state=checked]:bg-black data-[state=checked]:text-white"
            />
            <label
              htmlFor="screenshot"
              className="cursor-pointer flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Camera className="w-4 h-4" />
              Include a screenshot for better support?
            </label>
          </div>
        )}
      </form>
    </div>
  );
}
