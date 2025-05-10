"use client";

import { useUser } from "@clerk/nextjs";
import { ArchiveBoxIcon, BanknotesIcon, BookOpenIcon, InboxIcon, TrashIcon } from "@heroicons/react/24/outline";
import { ArrowRightIcon, CursorArrowRaysIcon, PlayCircleIcon } from "@heroicons/react/24/solid";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { Shuffle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import LogoIconAmber from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/icons/logoIconAmber.svg";
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
import RefundDemo from "./RefundDemo";
import CitationsDemo from "./CitationsDemo";
import ToolsDemo from "./ToolsDemo";

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

  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  type Slide = {
    src: string;
    alt: string;
    width: number;
    height: number;
  };

  const slides: Slide[] = [
    {
      src: "/images/websiteknowledge-ui-1.png",
      alt: "Website Knowledge UI",
      width: 400,
      height: 237,
    },
    {
      src: "/images/knowledgebank-ui-1.png",
      alt: "Knowledge Bank UI",
      width: 250,
      height: 237,
    },
    {
      src: "/images/message-reactions-ui-1.png",
      alt: "Message Reactions UI",
      width: 400,
      height: 237,
    },
  ];

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.targetTouches[0]) {
      setTouchStart(e.targetTouches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.targetTouches[0]) {
      setTouchEnd(e.targetTouches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }
    if (touchStart - touchEnd < -75) {
      setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
    }
  };

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
          const targetScrollY = window.scrollY + rect.top;

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

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev === 2 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [currentSlide]);

  const docsBaseUrl = getBaseUrl().includes("localhost") || getBaseUrl().includes("dev")
    ? "https://helperai.dev"
    : "https://helper.ai";

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
            <h1 className="text-6xl font-bold mb-24 text-center text-secondary dark:text-foreground">
              Helper helps customers help themselves.
            </h1>

            <div className="max-w-lg mx-auto">
              {showCustomerMessage && (
                <motion.div
                  className="flex justify-end mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="max-w-md w-full">
                    <div className="bg-[rgba(99,72,71,0.3)] rounded-t-2xl rounded-bl-2xl p-6 shadow-md min-h-[80px] flex items-center">
                      {customerQuestions[currentQuestionIndex] && (
                        <AnimatedTyping
                          text={customerQuestions[currentQuestionIndex]}
                          speed={30}
                          onComplete={handleCustomerTypingComplete}
                        />
                      )}
                    </div>
                    <div className="flex justify-end mt-2"></div>
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
                    <div
                      ref={helperMessageRef}
                      className="bg-[rgba(99,72,71,0.3)] rounded-t-2xl rounded-br-2xl p-6 shadow-md"
                    >
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
                            className="bg-bright text-black font-bold py-2 px-3 rounded-lg mt-4 transition-colors"
                          >
                            Take the tour
                          </button>
                        </motion.div>
                      )}
                    </div>
                    <div className="flex justify-start mt-2">
                      <div className="w-8 h-8">
                        <LogoIconAmber />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {showFeatures && (
          <section id="smarter-support" className="py-12 md:py-20">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 md:gap-16 gap-0 items-start">
                <div className="md:sticky md:top-20">
                  <h2 className="text-4xl md:text-5xl font-bold mb-8 text-secondary dark:text-foreground">
                    Helper guides users and resolves issues-- before they become tickets.
                  </h2>
                  <div className="space-y-6 mb-12 mt-8">
                    <div className="flex items-start gap-4">
                      <CursorArrowRaysIcon className="w-6 h-6 text-amber-400 mt-1" />
                      <span>
                        <span className="font-bold text-bright">Helping hand</span>
                        <span className="text-secondary dark:text-foreground">
                          {" "}
                          shows your customers how, instead of telling them.
                        </span>
                      </span>
                    </div>
                    <div className="flex items-start gap-4">
                      <BookOpenIcon className="w-6 h-6 mt-1" style={{ color: "#459EFD" }} />
                      <span>
                        <span className="font-bold" style={{ color: "#459EFD" }}>
                          Citations
                        </span>
                        <span className="text-secondary dark:text-foreground">
                          {" "}
                          back Helper's answers with real help doc snippets.
                        </span>
                      </span>
                    </div>
                    <div className="flex items-start gap-4">
                      <PlayCircleIcon className="w-6 h-6 mt-1" style={{ color: "#FF90E8" }} />
                      <span>
                        <span className="font-bold" style={{ color: "#FF90E8" }}>
                          Tools
                        </span>
                        <span className="text-secondary dark:text-foreground">
                          {" "}
                          handle common requests automatically. No agent needed.
                        </span>
                      </span>
                    </div>
                  </div>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-8 py-6 rounded-md text-lg">
                    Get Started
                  </Button>
                </div>

                <div className="order-1 md:order-2">
                  <div className="md:hidden">
                    <div
                      className="relative h-[400px] flex items-center justify-center"
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <div className="overflow-hidden w-full h-full flex items-center justify-center">
                        <div
                          className="flex transition-transform duration-500 ease-in-out h-full"
                          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                        >
                          <div className="w-full flex-shrink-0 flex items-center justify-center h-full">
                            <Image
                              src="/images/helpinghand-ui-mobile.png"
                              alt="Helping Hand UI"
                              width={600}
                              height={800}
                              className="w-full h-auto max-h-full object-contain"
                            />
                          </div>
                          <div className="w-full flex-shrink-0 flex items-center justify-center h-full">
                            <Image
                              src="/images/citations-ui.png"
                              alt="Citations UI"
                              width={600}
                              height={800}
                              className="w-full h-auto max-h-full object-contain"
                            />
                          </div>
                          <div className="w-full flex-shrink-0 flex items-center justify-center h-full">
                            <Image
                              src="/images/tool-usage-ui.png"
                              alt="Tool Usage UI"
                              width={600}
                              height={800}
                              className="w-full h-auto max-h-full object-contain"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center gap-2 mt-8 absolute left-0 right-0 bottom-0">
                        {[0, 1, 2].map((index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={`w-2 h-2 rounded-full transition-colors ${currentSlide === index ? "bg-amber-500" : "bg-gray-400"}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:flex flex-col gap-24">
                    <RefundDemo />
                    <CitationsDemo />
                    <ToolsDemo />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {showFeatures && (
          <section className="py-12 md:py-20">
            <div className="container mx-auto px-4">
              <div className="mb-24 text-center md:text-center max-w-4xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-bold mb-4 text-secondary dark:text-foreground text-left md:text-center ">
                  Helper delivers fast, accurate support by deeply understanding your content.
                </h2>
                <p className="text-lg md:text-xl text-secondary dark:text-foreground  mx-auto text-left md:text-center">
                  Website Knowledge keeps Helper in sync with your site automatically. Knowledge Bank lets agents add
                  custom answers on the fly, right from their inbox.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-6 items-center md:items-stretch">
                <div className="relative flex flex-col items-center md:items-end h-full px-4 md:px-0">
                  <div className="bg-[#3B1B1B] dark:bg-[#2B0808] rounded-3xl p-8 max-w-xl w-full mx-auto h-full flex flex-col justify-between mt-8 md:mt-0">
                    <div className="flex items-center bg-[#2B0808] rounded-xl px-6 py-4 mb-8">
                      <svg
                        className="w-6 h-6 text-yellow-300 mr-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
                      </svg>
                      <span className="text-lg md:text-xl text-[#FFE6B0]">yourwebsite.com</span>
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-center">
                        <span className="w-6 h-6 flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-[#C2D44B]" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="10" fill="#C2D44B" />
                            <path
                              d="M7 10.5l2 2 4-4"
                              stroke="#2B0808"
                              strokeWidth="2"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <span className="text-base md:text-lg text-[#FFE6B0]">Scanning website content</span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-6 h-6 flex items-center justify-center mr-4">
                          <svg
                            className="w-5 h-5 animate-spin text-[#FFD34E]"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <circle className="opacity-20" cx="10" cy="10" r="9" stroke="#FFD34E" strokeWidth="3" />
                            <path d="M10 2a8 8 0 1 1-8 8" stroke="#FFD34E" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                        </span>
                        <span className="text-base md:text-lg text-[#FFE6B0]">Extracting knowledge structure</span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-6 h-6 flex items-center justify-center mr-4">
                          <svg className="w-5 h-5" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="9" stroke="#FFE6B0" strokeWidth="2" fill="none" opacity="0.5" />
                          </svg>
                        </span>
                        <span className="text-base md:text-lg text-[#FFE6B0]">Indexing content</span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-6 h-6 flex items-center justify-center mr-4">
                          <svg className="w-5 h-5" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="9" stroke="#FFE6B0" strokeWidth="2" fill="none" opacity="0.5" />
                          </svg>
                        </span>
                        <span className="text-base md:text-lg text-[#FFE6B0]">Building AI model</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className="absolute -top-2 -left-1 md:-top-8 md:-left-2 rotate-[-6deg] z-10 flex items-center gap-2 px-4 py-2 rounded-xl border-1 font-medium shadow-md shadow-black/50 transition-transform duration-200 hover:-rotate-12"
                    style={{ borderColor: "#FF90E8", background: "#250404", color: "#FF90E8" }}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      style={{ color: "#FF90E8" }}
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
                    </svg>
                    Website knowledge
                  </div>
                </div>
                <div className="relative flex flex-col items-center md:items-start mt-16 md:mt-0 h-full px-4 md:px-0">
                  <div className="relative w-full flex justify-center md:justify-start h-full">
                    <div className="w-full max-w-xl flex flex-col gap-3 h-full">
                      <div className="flex-1 flex items-center bg-[#3B1B1B] dark:bg-[#2B0808] rounded-2xl px-6 py-4">
                        <BanknotesIcon className="w-6 h-6 text-[#FFD34E] mr-3" />
                        <span className="text-base md:text-lg text-[#FFE6B0] font-medium">
                          What's your refund policy?
                        </span>
                      </div>
                      <div className="flex-1 flex items-center bg-[#3B1B1B] dark:bg-[#2B0808] rounded-2xl px-6 py-4">
                        <ArchiveBoxIcon className="w-6 h-6 text-[#459EFD] mr-3" />
                        <span className="text-base md:text-lg text-[#FFE6B0] font-medium">
                          Can I expedite shipping?
                        </span>
                      </div>
                      <div className="flex-1 flex items-center bg-[#3B1B1B] dark:bg-[#2B0808] rounded-2xl px-6 py-4">
                        <TrashIcon className="w-6 h-6 text-[#FF4343] mr-3" />
                        <span className="text-base md:text-lg text-[#FFE6B0] font-medium">
                          How do I delete my account?
                        </span>
                      </div>
                      <div className="flex-1 flex items-center bg-[#3B1B1B] dark:bg-[#2B0808] rounded-2xl px-6 py-4">
                        <svg
                          className="w-6 h-6 text-[#FFE6B0] mr-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="12" cy="12" r="10" stroke="#FFE6B0" strokeWidth="2" fill="none" />
                          <path d="M12 8v8M8 12h8" stroke="#FFE6B0" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span className="text-base md:text-lg text-[#FFE6B0] font-medium">Add knowledge</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className="absolute -top-8 right-1 md:-top-10 md:right-20 rotate-[4deg] z-10 flex items-center gap-2 px-4 py-2 rounded-xl border-1 font-medium shadow-md shadow-black/50 transition-transform duration-200 hover:rotate-12"
                    style={{ borderColor: "#459EFD", background: "#250404", color: "#459EFD" }}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      style={{ color: "#459EFD" }}
                    >
                      <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5V6.5A2.5 2.5 0 016.5 4H20v13M4 19.5H20" />
                    </svg>
                    Knowledge bank
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {showFeatures && (
          <section className="py-12 md:py-20">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                <div className="md:sticky md:top-20">
                  <h2 className="text-5xl font-bold mb-4 text-secondary dark:text-foreground">Human in the loop</h2>
                  <p className="text-lg text-secondary dark:text-foreground mb-8">
                    Helper steps back when humans need to step in.
                    <br /> <br /> Get notified in Slack when complex or high-priority issues arise, use @helper to
                    quickly surface context, and easily return tickets to Helper once your team has resolved the issue.
                  </p>
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
        )}

        {showFeatures && (
          <section className="py-20">
            <div className="container mx-auto px-4 max-w-7xl">
              <h2 className="text-5xl font-bold text-secondary dark:text-foreground text-center mb-12">
                Measure your success
              </h2>
              <p className="text-lg text-secondary dark:text-foreground text-center mb-12 max-w-3xl mx-auto">
                Helper provides comprehensive analytics to track the impact on your support operations. See faster
                response times, improved customer sentiment, and happier support agents.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch h-full min-h-[480px]">
                <div className="md:col-span-2 flex flex-col justify-between h-full">
                  <div className="text-center"></div>
                  <div className="h-full">
                    <ComparisonHistogram />
                  </div>
                </div>
                <div className="flex flex-col gap-8 h-full">
                  <div className="bg-[rgba(99,72,71,0.3)] rounded-2xl p-8 flex-1 flex flex-col justify-between">
                    <div className="text-center mb-2">
                      <div className="text-3xl font-bold text-[#FFE6B0] mb-1">Customer sentiment</div>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <img src="/images/customer-sentiment.svg" alt="Customer sentiment" className="w-full max-w-xs" />
                    </div>
                  </div>
                  <div className="bg-[rgba(99,72,71,0.3)] rounded-2xl p-8 flex-1 flex flex-col items-center justify-center">
                    <div className="text-center mb-2">
                      <div className="text-3xl font-bold text-[#FFE6B0] mb-1">Agent satisfaction</div>
                    </div>
                    <span className="text-7xl mb-8 pt-4">😊</span>
                    <span className="text-5xl font-bold mb-2" style={{ color: "#C2D44B" }}>
                      92%
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-center mt-12">
                <Button className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-8 py-6 rounded-md text-lg">
                  Get started
                </Button>
              </div>
            </div>
          </section>
        )}

        <section className="w-full py-20 bg-[#2B0808] dark:bg-[#2B0808]">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold mb-12 text-[#FFE6B0]">Knowledge base</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Link href={`${docsBaseUrl}/docs`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-[#3B1B1B] dark:bg-[#3B1B1B] rounded-2xl p-8 transition-transform hover:-rotate-2 hover:shadow-xl group" style={{ boxShadow: 'none' }}>
                <span className="flex items-center justify-center w-10 h-10">
                  <svg width="24" height="24" fill="none" stroke="#459EFD" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M12 4v16"/><path d="M4 4h16v16H4z"/></svg>
                </span>
                <span className="text-lg font-bold" style={{ color: '#FFE6B0' }}>Getting started</span>
                <span className="ml-auto" style={{ color: '#FFE6B0' }}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                </span>
              </Link>
              <Link href={`${docsBaseUrl}/docs/tools/01-overview`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-[#3B1B1B] dark:bg-[#3B1B1B] rounded-2xl p-8 transition-transform hover:-rotate-2 hover:shadow-xl group" style={{ boxShadow: 'none' }}>
                <span className="flex items-center justify-center w-10 h-10">
                  <svg width="24" height="24" fill="none" stroke="#C2D44B" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                </span>
                <span className="text-lg font-bold" style={{ color: '#FFE6B0' }}>Tools</span>
                <span className="ml-auto" style={{ color: '#FFE6B0' }}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                </span>
              </Link>
              <Link href={`${docsBaseUrl}/docs/api/01-overview`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-[#3B1B1B] dark:bg-[#3B1B1B] rounded-2xl p-8 transition-transform hover:-rotate-2 hover:shadow-xl group" style={{ boxShadow: 'none' }}>
                <span className="flex items-center justify-center w-10 h-10">
                  <svg width="24" height="24" fill="none" stroke="#FF90E8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
                </span>
                <span className="text-lg font-bold" style={{ color: '#FFE6B0' }}>Conversation api</span>
                <span className="ml-auto" style={{ color: '#FFE6B0' }}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                </span>
              </Link>
              <Link href={`${docsBaseUrl}/docs/api-reference/create-conversation`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-[#3B1B1B] dark:bg-[#3B1B1B] rounded-2xl p-8 transition-transform hover:-rotate-2 hover:shadow-xl group" style={{ boxShadow: 'none' }}>
                <span className="flex items-center justify-center w-10 h-10">
                  <svg width="24" height="24" fill="none" stroke="#FF4343" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
                </span>
                <span className="text-lg font-bold" style={{ color: '#FFE6B0' }}>Api references</span>
                <span className="ml-auto" style={{ color: '#FFE6B0' }}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                </span>
              </Link>
              <Link href={`${docsBaseUrl}/docs/widget/01-overview`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-[#3B1B1B] dark:bg-[#3B1B1B] rounded-2xl p-8 transition-transform hover:-rotate-2 hover:shadow-xl group" style={{ boxShadow: 'none' }}>
                <span className="flex items-center justify-center w-10 h-10">
                  <svg width="24" height="24" fill="none" stroke="#FFD34E" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M8 17v2a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2"/></svg>
                </span>
                <span className="text-lg font-bold" style={{ color: '#FFE6B0' }}>Chat widget</span>
                <span className="ml-auto" style={{ color: '#FFE6B0' }}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                </span>
              </Link>
            </div>
          </div>
        </section>

        <footer className="bottom-0 left-0 right-0 w-full h-24 pl-5 pb-5" style={{ backgroundColor: footerBgColor }}>
          <div className="flex items-center">
            <a href="https://antiwork.com/" target="_blank" rel="noopener noreferrer">
              <svg width="200" height="40" viewBox="0 0 500 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M57 91L41.4115 47.5L72.5885 47.5L57 91Z" fill={footerTextColor} />
                <path d="M25 91L9.41154 47.5L40.5885 47.5L25 91Z" fill={footerTextColor} />
              </svg>
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
