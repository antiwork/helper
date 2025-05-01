import { ChatBubbleLeftRightIcon, HandThumbUpIcon } from "@heroicons/react/24/outline";
import { UIMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

type Props = {
  conversationSlug: string | null;
  token: string | null;
  messageStatus: string;
  lastMessage: UIMessage | undefined;
  onTalkToTeamClick: () => void;
  isEscalated?: boolean;
};

export default function SupportButtons({
  conversationSlug,
  token,
  messageStatus,
  lastMessage,
  onTalkToTeamClick,
  isEscalated = false,
}: Props) {
  const [isHelpfulAnimating, setIsHelpfulAnimating] = useState(false);
  const [isTalkToTeamAnimating, setIsTalkToTeamAnimating] = useState(false);
  const [isHelpful, setIsHelpful] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [hasClickedTalkToHuman, setHasClickedTalkToHuman] = useState(false);

  const idFromAnnotation =
    lastMessage?.annotations?.find(
      (annotation): annotation is { id: string | number } =>
        typeof annotation === "object" && annotation !== null && "id" in annotation,
    )?.id ?? null;
  const persistedId = idFromAnnotation ?? (!lastMessage?.id.startsWith("client_") ? lastMessage?.id : null);

  const lastMessageIsGuide = lastMessage?.parts?.find(
    (part) => part.type === "tool-invocation" && part.toolInvocation.toolName === "guide_user",
  );

  const handleHelpfulClick = async () => {
    if (!conversationSlug || !token) return;

    setIsHelpfulAnimating(true);
    setIsHelpful(true);

    try {
      const response = await fetch(`/api/chat/conversation/${conversationSlug}/message/${persistedId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "thumbs-up",
        }),
      });

      if (response.ok) {
        setTimeout(() => {
          setIsVisible(false);
        }, 1000);
      }
    } catch (error) {
      captureExceptionAndLog(error);
    }

    setTimeout(() => setIsHelpfulAnimating(false), 1000);
  };

  const handleTalkToTeamClick = () => {
    setIsTalkToTeamAnimating(true);
    setHasClickedTalkToHuman(true);
    onTalkToTeamClick();
    setTimeout(() => setIsTalkToTeamAnimating(false), 1000);
  };

  const shouldHideButtons = isEscalated || hasClickedTalkToHuman || lastMessageIsGuide;

  return (
    <AnimatePresence>
      {isVisible && messageStatus === "ready" && lastMessage && !shouldHideButtons && (
        <motion.div
          className="flex justify-center gap-4 py-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <button
            onClick={handleHelpfulClick}
            className={`flex items-center gap-2 rounded-full border ${
              isHelpful ? "border-green-500 bg-green-100 text-green-700" : "border-gray-400 text-black"
            } px-4 py-2 text-sm ${isHelpful ? "" : "hover:bg-gray-100"} transition-colors duration-200`}
          >
            <motion.div
              className="w-4 h-4 origin-bottom-left"
              animate={
                isHelpfulAnimating
                  ? {
                      rotate: [0, 24, -16, -7, 0],
                      transition: {
                        duration: 1,
                        ease: "easeInOut",
                        repeatType: "reverse",
                        repeat: 0,
                      },
                    }
                  : {
                      rotate: 0,
                    }
              }
            >
              <HandThumbUpIcon className={`h-4 w-4 ${isHelpful ? "text-green-600" : ""}`} />
            </motion.div>
            // Microcopy reinforce that we’re an approachable team, not a faceless bot. Previously "That solved it!"
            Looks good—thanks!
          </button>
          <button
            onClick={handleTalkToTeamClick}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted transition-colors duration-200 text-foreground"
          >
            <motion.div
              className="w-4 h-4 origin-center"
              animate={
                isTalkToTeamAnimating
                  ? {
                      scale: [1, 1.2, 0.9, 1],
                      transition: {
                        duration: 0.8,
                        ease: "easeInOut",
                        repeatType: "reverse",
                        repeat: 0,
                      },
                    }
                  : {
                      scale: 1,
                    }
              }
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
            </motion.div>
            // Microcopy: reinforce that we’re an approachable team, not a faceless bot
            Chat with a real person
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
