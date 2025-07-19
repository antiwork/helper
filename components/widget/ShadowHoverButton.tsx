import { Send } from "lucide-react";
import { useState } from "react";

export default function ShadowHoverButton({
  isLoading,
  isGumroadTheme,
}: {
  isLoading: boolean;
  isGumroadTheme: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative ml-2">
      <button
        type="submit"
        aria-label="Send message"
        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-md bg-primary text-2xl text-primary-foreground transition-all duration-300 ease-in-out hover:border ${isGumroadTheme ? "hover:border-black hover:bg-[#FF90E7] hover:text-black" : "hover:border-bright-foreground hover:bg-bright hover:text-bright-foreground"} ${isHovered && !isLoading ? "-translate-x-0.5 -translate-y-0.5 transform" : ""} ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        onMouseEnter={() => !isLoading && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isLoading}
      >
        <Send className="h-3.5 w-3.5 -rotate-90" />
      </button>
      <div
        className={`absolute left-0 top-0 h-8 w-8 rounded-md ${isGumroadTheme ? "bg-black" : "bg-bright-foreground"} transition-all duration-300 ease-in-out ${isLoading ? "opacity-50" : ""}`}
      />
    </div>
  );
}
