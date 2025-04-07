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

  const shouldHideButtons = isEscalated || hasClickedTalkToHuman;

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
              isHelpful ? "border-green-500 bg-green-100 text-green-700" : "border-gray-400"
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
            That solved it!
          </button>
          <button
            onClick={handleTalkToTeamClick}
            className="flex items-center gap-2 rounded-full border border-gray-400 px-4 py-2 text-sm hover:bg-gray-100 transition-colors duration-200"
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
            Talk to a human
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
