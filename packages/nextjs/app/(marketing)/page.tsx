"use client";

import { useUser } from "@clerk/nextjs";
import { BookOpenIcon, InboxIcon } from "@heroicons/react/24/outline";
import { ArrowRightIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import { Shuffle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import AnimatedCursor from "@/components/animated-cursor";
import AnimatedTyping from "@/components/animated-typing";
import ComparisonHistogram from "@/components/comparison-histogram";
import { getBaseUrl } from "@/components/constants";
import MessageBubble from "@/components/message-bubble";
import ResponseTimeChart from "@/components/response-time-chart";
import SlackInterface from "@/components/slack-interface";
import SlackNotification from "@/components/slack-notification";
import { Button } from "@/components/ui/button";
import { MarketingHeader } from "./MarketingHeader";

type PositionConfig = {
  bubbleVariant: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  labelPosition: "left" | "right" | "top" | "bottom";
};

const featurePositions: Record<string, PositionConfig> = {
  smarterSupport: { bubbleVariant: "bottomLeft", labelPosition: "top" },
  knowledgeBank: { bubbleVariant: "bottomRight", labelPosition: "right" },
  messageReactions: { bubbleVariant: "bottomRight", labelPosition: "right" },
  shorthandReplies: { bubbleVariant: "bottomRight", labelPosition: "top" },
  slackInterface: { bubbleVariant: "bottomLeft", labelPosition: "top" },
  slackNotification: { bubbleVariant: "bottomLeft", labelPosition: "top" },
  responseTimeChart: { bubbleVariant: "bottomRight", labelPosition: "bottom" },
  finalToggle: { bubbleVariant: "bottomRight", labelPosition: "left" },
};

const featureBubbleTexts: Record<string, string> = {
  smarterSupport: "Instead of just telling them what to do, I'll guide your customers through every step.",
  knowledgeBank:
    "Store critical policies, product details, and procedures, and I'll instantly retrieve and incorporate them into accurate responses.",
  messageReactions:
    "Feedback helps me learn what works and what doesn't, so I can step in confidently—and step aside when I shouldn't.",
  shorthandReplies:
    "Type simple instructions and watch I craft complete, professional responses while maintaining your voice.",
  slackInterface:
    "Slack is your support HQ. Ask me how many customers are asking about something—or assign, reply, and close tickets right from the thread.",
  slackNotification: "If I need a human, I'll send a heads-up in Slack so your team can jump in fast.",
  responseTimeChart:
    "See how Helper dramatically reduces response times even as ticket volume increases, allowing your team to handle more inquiries with less stress.",
  finalToggle: "Ready to see how AI can transform your customer support?",
};

const defaultPositionConfig: PositionConfig = {
  bubbleVariant: "topRight",
  labelPosition: "left",
};

export default function Home() {
  const [customerQuestions, setCustomerQuestions] = useState([
    "How can Helper transform my customer support?",
    "How can Helper cut my response time in half?",
    "Can Helper integrate with our existing tools?",
    "How does Helper handle complex customer issues?",
    "Will Helper reduce our support team's workload?",
  ]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [showCustomerMessage, setShowCustomerMessage] = useState(false);
  const [showHelperMessage, setShowHelperMessage] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [showFeatures, setShowFeatures] = useState(false);
  const [activeBubble, setActiveBubble] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [customerTypingComplete, setCustomerTypingComplete] = useState(false);
  const [helperTypingComplete, setHelperTypingComplete] = useState(false);
  const [showHelperButton, setShowHelperButton] = useState(false);
  const [cursorAnimating, setCursorAnimating] = useState(true);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const showMeButtonRef = useRef<HTMLButtonElement>(null);
  const lastActiveFeature = useRef<string | null>(null);
  const initialScrollComplete = useRef(false);
  const helperMessageRef = useRef<HTMLDivElement>(null);
  const [currentBubbleText, setCurrentBubbleText] = useState("");

  const [footerBgColor, setFooterBgColor] = useState("#2B0808");
  const [footerTextColor, setFooterTextColor] = useState("#FFFFFF");
  const [githubStars, setGithubStars] = useState(0);

  const [currentPositionConfig, setCurrentPositionConfig] = useState<PositionConfig>({
    bubbleVariant: "topRight",
    labelPosition: "left",
  });

  useEffect(() => {
    const updateInitialCursorPosition = () => {
      if (cursorAnimating) {
        setCursorPosition({
          x: window.innerWidth - 50,
          y: window.innerHeight - 50,
        });
      }
    };

    updateInitialCursorPosition();
    window.addEventListener("resize", updateInitialCursorPosition);

    return () => window.removeEventListener("resize", updateInitialCursorPosition);
  }, [cursorAnimating]);

  useEffect(() => {
    const questionInterval = setInterval(() => {
      setCurrentQuestionIndex((prev) => (prev + 1) % customerQuestions.length);
    }, 5000);

    return () => clearInterval(questionInterval);
  }, [customerQuestions.length]);

  useEffect(() => {
    const customerTimer = setTimeout(() => {
      setShowCustomerMessage(true);
    }, 1000);

    return () => clearTimeout(customerTimer);
  }, []);

  useEffect(() => {
    if (customerTypingComplete) {
      const helperTimer = setTimeout(() => {
        setShowHelperMessage(true);
      }, 500);
      return () => clearTimeout(helperTimer);
    }
  }, [customerTypingComplete]);

  useEffect(() => {
    if (helperTypingComplete) {
      const buttonTimer = setTimeout(() => {
        setShowHelperButton(true);
        setTimeout(() => {
          if (showMeButtonRef.current) {
            const buttonRect = showMeButtonRef.current.getBoundingClientRect();
            const finalX = buttonRect.left + buttonRect.width / 2;
            const finalY = window.scrollY + buttonRect.top + buttonRect.height / 2;
            setCursorPosition({ x: finalX, y: finalY });
            setCursorAnimating(false);
            setShowSpotlight(true);
          }
        }, 100);
      }, 500);
      return () => clearTimeout(buttonTimer);
    }
  }, [helperTypingComplete]);

  useEffect(() => {
    fetch("https://api.github.com/repos/antiwork/helper")
      .then((res) => res.json())
      .then((data) => {
        setGithubStars(data.stargazers_count || 0);
      })
      .catch(() => {});
  }, []);

  const generateRandomColors = useCallback(() => {
    const generateRandomColor = () =>
      `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`;

    const getContrastRatio = (color1: string, color2: string) => {
      const luminance = (color: string) => {
        const rgb = parseInt(color.slice(1), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const l1 = luminance(color1);
      const l2 = luminance(color2);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    let bgColor, textColor;
    do {
      bgColor = generateRandomColor();
      textColor = generateRandomColor();
    } while (getContrastRatio(bgColor, textColor) < 4.5);

    setFooterBgColor(bgColor);
    setFooterTextColor(textColor);
  }, []);

  useEffect(() => {
    if (showFeatures && !initialScrollComplete.current) {
      const timer = setTimeout(() => {
        const smarterSupportSection = document.getElementById("smarter-support");
        if (smarterSupportSection) {
          const rect = smarterSupportSection.getBoundingClientRect();
          const targetScrollY = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2;

          window.scrollTo({
            top: targetScrollY,
            behavior: "smooth",
          });

          setTimeout(() => {
            setActiveBubble("smarterSupport");
            setCurrentBubbleText(featureBubbleTexts.smarterSupport || "");

            setCurrentPositionConfig(featurePositions.smarterSupport ?? defaultPositionConfig);

            const dashboardImage = smarterSupportSection.querySelector("img");
            if (dashboardImage) {
              const imageRect = dashboardImage.getBoundingClientRect();
              const cursorX = imageRect.left - 10;
              const cursorY = window.scrollY + imageRect.top + imageRect.height / 2 + 160;
              setCursorPosition({ x: cursorX, y: cursorY });
            } else {
              const rect = smarterSupportSection.getBoundingClientRect();
              const cursorX = rect.left - 10;
              const cursorY = window.scrollY + rect.top + rect.height / 2 + 160;
              setCursorPosition({ x: cursorX, y: cursorY });
            }

            initialScrollComplete.current = true;
          }, 800);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [showFeatures]);

  const handleShowMe = () => {
    setShowFeatures(true);
    initialScrollComplete.current = false;
  };

  const handleCustomerTypingComplete = () => {
    setCustomerTypingComplete(true);
  };

  const handleHelperTypingComplete = () => {
    setHelperTypingComplete(true);
  };

  return (
    <main className="bg-[#2B0808] text-white flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-50">
        <MarketingHeader bgColor="#2B0808" />
      </div>

      <div className="flex-grow pt-20">
        {showCursor && (
          <AnimatedCursor
            position={cursorPosition}
            animate={cursorAnimating}
            showSpotlight={false}
            labelPosition={currentPositionConfig.labelPosition}
          />
        )}

        {currentBubbleText && (
          <MessageBubble
            position={cursorPosition}
            text={currentBubbleText}
            variant={currentPositionConfig.bubbleVariant}
          />
        )}

        <section className="min-h-screen flex items-center justify-center">
          <div className="container mx-auto px-4">
            <h1 className="text-6xl font-bold mb-24 text-center">Helper helps customers help themselves.</h1>

            <div className="max-w-lg mx-auto">
              {showCustomerMessage && (
                <motion.div
                  className="flex justify-end mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="max-w-md w-full">
                    <div className="bg-[#412020] rounded-t-2xl rounded-bl-2xl p-6 shadow-lg/40 min-h-[80px] flex items-center">
                      {customerQuestions[currentQuestionIndex] && (
                        <AnimatedTyping
                          text={customerQuestions[currentQuestionIndex]}
                          speed={30}
                          onComplete={handleCustomerTypingComplete}
                        />
                      )}
                    </div>
                    <div className="flex justify-end mt-2">
                      <div className="text-2xl">👩‍💻</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {showHelperMessage && (
                <motion.div
                  className="flex mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="w-96">
                    <div ref={helperMessageRef} className="bg-[#412020] rounded-t-2xl rounded-br-2xl p-6 shadow-lg/40">
                      <AnimatedTyping
                        text="Let me show you how I can help..."
                        speed={50}
                        onComplete={handleHelperTypingComplete}
                      />
                      {showHelperButton && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                        >
                          <button
                            ref={showMeButtonRef}
                            onClick={handleShowMe}
                            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-3 rounded-lg mt-4 transition-colors"
                          >
                            Take the tour
                          </button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {showFeatures && (
          <section id="smarter-support" className="py-20">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                <div className="sticky top-20">
                  <h2 className="text-5xl font-bold mb-8">
                    Helper guides users and resolves issues-- before they become tickets.
                  </h2>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-8 py-6 rounded-md text-lg">
                    Get Started
                  </Button>
                </div>

                <div>
                  <Image src="/images/helping-hand-ui.png" alt="Helping Hand UI" width={600} height={800} />
                </div>
              </div>
            </div>
          </section>
        )}

        {showFeatures && (
          <>
            <section id="features-section" className="py-20">
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                  <div className="space-y-12">
                    <div id="knowledgeBank" className="px-20 py-8">
                      <Image src="/images/knowledge-bank.png" alt="Knowledge Bank" width={600} height={400} />
                    </div>

                    <div id="messageReactions" className="px-20 py-8">
                      <Image src="/images/message-reactions.png" alt="Message Reactions" width={600} height={400} />
                    </div>

                    <div id="shorthandReplies" className="px-20 py-8">
                      <Image src="/images/shorthand-replies.png" alt="Shorthand Replies" width={600} height={400} />
                    </div>
                  </div>

                  <div className="sticky top-20">
                    <h2 className="text-5xl font-bold mb-8">
                      Powered by your knowledge. Refined through feedback. Delivered effortlessly.
                    </h2>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-8 py-6 rounded-md text-lg">
                      Get Started
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <section className="py-20">
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                  <div className="sticky top-20">
                    <h2 className="text-5xl font-bold mb-8">Slack: Your New Support Command Center</h2>

                    <Button className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-8 py-6 rounded-md text-lg">
                      Get Started
                    </Button>
                  </div>

                  <div className="space-y-12">
                    <div id="slackInterface">
                      <SlackInterface />
                    </div>

                    <div id="slackNotification">
                      <SlackNotification />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="py-16">
              <div className="container mx-auto px-4 mb-96 text-center">
                <h2 className="text-2xl font-bold mb-8">Response time</h2>
                <div id="finalToggle" className="relative">
                  <ComparisonHistogram />
                </div>
                <Button className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-8 py-6 rounded-md text-lg mt-12">
                  Get Started
                </Button>
              </div>
            </section>

            <footer
              className="fixed bottom-0 left-0 right-0 w-full h-24 pl-5 pb-5"
              style={{ backgroundColor: footerBgColor }}
            >
              <div className="flex items-center">
                <a href="https://antiwork.com/" target="_blank" rel="noopener noreferrer">
                  <svg width="200" height="40" viewBox="0 0 500 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M57 91L41.4115 47.5L72.5885 47.5L57 91Z" fill={footerTextColor} />
                    <path d="M25 91L9.41154 47.5L40.5885 47.5L25 91Z" fill={footerTextColor} />
                  </svg>
                </a>
              </div>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
