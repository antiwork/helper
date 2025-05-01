"use client";

import { useUser } from "@clerk/nextjs";
import { BookOpenIcon, InboxIcon } from "@heroicons/react/24/outline";
import { ArrowRightIcon } from "@heroicons/react/24/solid";
import { Shuffle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import AnimatedCursor from "@/components/animated-cursor";
import ComparisonHistogram from "@/components/comparison-histogram";
import { getBaseUrl } from "@/components/constants";
import MessageBubble from "@/components/message-bubble";
import ResponseTimeChart from "@/components/response-time-chart";
import SlackInterface from "@/components/slack-interface";
import SlackNotification from "@/components/slack-notification";
import { Button } from "@/components/ui/button";

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

const GitHubIcon = ({ className }: { className?: string }) => {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.239 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />{" "}
    </svg>
  );
};

const LoginButtons = ({ githubStars }: { githubStars: number }) => {
  const { isSignedIn } = useUser();

  return (
    <div className="flex space-x-2">
      <Link href={`${getBaseUrl()}/docs`} target="_blank">
        <Button variant="subtle" className="text-white bg-white/10">
          <span className="flex items-center">
            <BookOpenIcon className="h-5 w-5 mr-2" />
            Docs
          </span>
        </Button>
      </Link>
      <Link href="https://github.com/antiwork/helper" target="_blank">
        <Button variant="subtle" className="text-white bg-white/10">
          <span className="flex items-center">
            <GitHubIcon className="h-5 w-5 mr-2" />
            {githubStars.toLocaleString()}
          </span>
        </Button>
      </Link>
      <Link href="/mailboxes">
        <Button variant="subtle" className="text-white bg-white/10">
          <span className="flex items-center">
            {isSignedIn ? (
              <>
                <InboxIcon className="h-5 w-5 mr-2" />
                Go to mailbox
              </>
            ) : (
              <>
                Start using Helper
                <ArrowRightIcon className="h-5 w-5 ml-2" />
              </>
            )}
          </span>
        </Button>
      </Link>
    </div>
  );
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
  const [displayedQuestionText, setDisplayedQuestionText] = useState("");
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [showCustomerMessage, setShowCustomerMessage] = useState(true);
  const [showHelperMessage, setShowHelperMessage] = useState(true);
  const [showCursor, setShowCursor] = useState(true);
  const [showFeatures, setShowFeatures] = useState(false);
  const [activeBubble, setActiveBubble] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 80, y: 450 });
  const [customerTypingComplete, setCustomerTypingComplete] = useState(false);
  const [helperTypingComplete, setHelperTypingComplete] = useState(false);
  const [showHelperButton, setShowHelperButton] = useState(false);
  const [cursorAnimating, setCursorAnimating] = useState(true);
  const [stopCursorAnimation, setStopCursorAnimation] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(true);
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
    const questionInterval = setInterval(() => {
      setCurrentQuestionIndex((prev) => (prev + 1) % customerQuestions.length);
    }, 5000);

    return () => clearInterval(questionInterval);
  }, [customerQuestions.length]);

  useEffect(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setDisplayedQuestionText("");

    const targetText = customerQuestions[currentQuestionIndex];
    if (!targetText) return;

    let index = 0;
    const typeSpeed = 30;

    const typeChar = () => {
      if (index < targetText.length) {
        setDisplayedQuestionText((prev) => prev + targetText.charAt(index));
        index++;
        typingTimeoutRef.current = setTimeout(typeChar, typeSpeed);
      } else {
        typingTimeoutRef.current = null;
      }
    };

    typingTimeoutRef.current = setTimeout(typeChar, 100);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentQuestionIndex, customerQuestions]);

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
    if (helperMessageRef.current) {
      const rect = helperMessageRef.current.getBoundingClientRect();
      setCursorPosition({ x: rect.left - 40, y: rect.top + rect.height / 2 });
    }
  }, [helperTypingComplete]);

  useEffect(() => {
    setTimeout(() => {
      setHelperTypingComplete(true);
    }, 1000);
  }, []);

  useEffect(() => {
    if (helperTypingComplete) {
      setTimeout(() => {
        setShowHelperButton(true);
      }, 500);
    }
  }, [helperTypingComplete]);

  useEffect(() => {
    if (!showFeatures) return;

    setStopCursorAnimation(true);

    setShowSpotlight(false);

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const viewportMiddle = scrollY + viewportHeight / 2;

      const featureElements = {
        smarterSupport: document.getElementById("smarter-support"),
        knowledgeBank: document.getElementById("knowledgeBank"),
        messageReactions: document.getElementById("messageReactions"),
        shorthandReplies: document.getElementById("shorthandReplies"),
        slackInterface: document.getElementById("slackInterface"),
        slackNotification: document.getElementById("slackNotification"),
        responseTimeChart: document.getElementById("responseTimeChart"),
      };

      let closestElement: HTMLElement | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;
      let closestFeature = "";

      for (const [feature, element] of Object.entries(featureElements)) {
        if (element) {
          const rect = element.getBoundingClientRect();
          const elementTop = scrollY + rect.top;
          const elementMiddle = elementTop + rect.height / 2;
          const distance = Math.abs(viewportMiddle - elementMiddle);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestElement = element;
            closestFeature = feature;
          }
        }
      }

      if (closestElement && closestFeature !== lastActiveFeature.current) {
        const rect = closestElement.getBoundingClientRect();

        let cursorX = rect.left;
        let cursorY = scrollY + rect.top + rect.height / 2;

        switch (closestFeature) {
          case "smarterSupport":
            const dashboardImage = document.querySelector("#smarter-support img");
            if (dashboardImage) {
              const imageRect = dashboardImage.getBoundingClientRect();
              cursorX = imageRect.left - 10;
              cursorY = scrollY + imageRect.top + imageRect.height / 2 + 160;
            }
            break;
          case "knowledgeBank":
            const knowledgeBankImg = document.querySelector("#knowledgeBank img");
            if (knowledgeBankImg) {
              const imgRect = knowledgeBankImg.getBoundingClientRect();
              cursorX = imgRect.right - 5;
              cursorY = scrollY + imgRect.top + imgRect.height / 2 + 130;
            }
            break;
          case "messageReactions":
            const reactionsImg = document.querySelector("#messageReactions img");
            if (reactionsImg) {
              const imgRect = reactionsImg.getBoundingClientRect();
              cursorX = imgRect.right - 5;
              cursorY = scrollY + imgRect.top + imgRect.height / 2 + 130;
            }
            break;
          case "shorthandReplies":
            const shorthandImg = document.querySelector("#shorthandReplies img");
            if (shorthandImg) {
              const imgRect = shorthandImg.getBoundingClientRect();
              cursorX = imgRect.right - 5;
              cursorY = scrollY + imgRect.top + imgRect.height / 2 + 130;
            }
            break;
          case "slackInterface":
            const slackInterface = document.querySelector("#slackInterface");
            if (slackInterface) {
              const interfaceRect = slackInterface.getBoundingClientRect();
              cursorX = interfaceRect.left - 10;
              cursorY = scrollY + interfaceRect.top + interfaceRect.height / 2;
            }
            break;
          case "slackNotification":
            const notification = document.querySelector("#slackNotification");
            if (notification) {
              const notificationRect = notification.getBoundingClientRect();
              cursorX = notificationRect.left - 10;
              cursorY = scrollY + notificationRect.top + notificationRect.height / 2;
            }
            break;
          case "responseTimeChart":
            const chart = document.querySelector("#responseTimeChart");
            if (chart) {
              const chartRect = chart.getBoundingClientRect();
              cursorX = chartRect.left + 20;
              cursorY = scrollY + chartRect.top + chartRect.height / 2 + 40;
            }
            break;
        }

        if (!cursorX || !cursorY) {
          cursorX = rect.left + 60;
          cursorY = scrollY + rect.top + rect.height / 2;
        }

        cursorX = Math.max(cursorX, 60);

        cursorX = Math.min(cursorX, viewportWidth - 60);

        setCursorPosition({ x: cursorX, y: cursorY });
        setActiveBubble(closestFeature);
        setCurrentBubbleText(featureBubbleTexts[closestFeature] || "");

        setCurrentPositionConfig(featurePositions[closestFeature] ?? defaultPositionConfig);

        lastActiveFeature.current = closestFeature;
      }

      const finalToggle = document.querySelector("#finalToggle");
      if (finalToggle) {
        const rect = finalToggle.getBoundingClientRect();
        const switchElement = finalToggle.querySelector('[role="switch"]');

        if (switchElement) {
          const switchRect = switchElement.getBoundingClientRect();
          if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
            setCursorPosition({
              x: switchRect.left + switchRect.width / 2 - 20,
              y: window.scrollY + switchRect.top + switchRect.height / 2 + 25,
            });
            setActiveBubble("finalToggle");
            setCurrentPositionConfig(featurePositions.finalToggle ?? defaultPositionConfig);
            setCurrentBubbleText(featureBubbleTexts.finalToggle || "");
          }
        }
      } else if (lastActiveFeature.current !== null) {
        setActiveBubble(null);
        setCurrentBubbleText("");
        lastActiveFeature.current = null;
      }
    };

    setTimeout(handleScroll, 100);

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showFeatures]);

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
      <header className="sticky top-0 z-50 bg-[#2B0808] backdrop-blur-sm">
        <nav className="flex items-center justify-between p-4 mx-auto max-w-7xl">
          <div className="relative w-[100px] h-[32px]">
            <Link href="/">
              <Image src="/logo-white.svg" priority alt="Helper" width={100} height={32} />
            </Link>
          </div>
          <div className="flex space-x-2">
            <LoginButtons githubStars={githubStars} />
          </div>
        </nav>
      </header>

      <div className="border-b border-white/10"></div>

      <div className="flex-grow">
        {showCursor && (
          <AnimatedCursor
            position={cursorPosition}
            animate={cursorAnimating}
            stopAnimation={stopCursorAnimation}
            showSpotlight={showSpotlight}
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
              <div className="flex justify-end mb-8">
                <div className="max-w-md w-full">
                  <div className="bg-[#412020] rounded-t-2xl rounded-bl-2xl p-6 shadow-lg/40 h-[80px] flex items-center">
                    <span>{displayedQuestionText}</span>
                  </div>
                  <div className="flex justify-end mt-2">
                    <div className="text-2xl">👩‍💻</div>
                  </div>
                </div>
              </div>

              {showHelperMessage && (
                <div className="flex mb-8">
                  <div className="w-96">
                    <div ref={helperMessageRef} className="bg-[#412020] rounded-t-2xl rounded-br-2xl p-6 shadow-lg/40">
                      Let me show you how I can help...
                      <button
                        ref={showMeButtonRef}
                        onClick={handleShowMe}
                        className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-6 rounded-md mt-4"
                      >
                        TAKE THE TOUR
                      </button>
                    </div>
                  </div>
                </div>
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
              className="w-full h-[10vh] px-12 transition-colors duration-300 flex items-center mt-auto"
              style={{ backgroundColor: footerBgColor }}
            >
              <div className=" flex justify-between items-center w-full max-w-7xl mx-auto">
                <div className="flex items-center">
                  An
                  <a href="https://antiwork.com/" target="_blank" rel="noopener noreferrer">
                    <svg width="200" height="40" viewBox="0 0 500 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M99.94 73.44H111.04L105.64 57.72H105.52L99.94 73.44ZM100.84 47.16H110.5L126.52 90H116.74L113.5 80.46H97.48L94.12 90H84.64L100.84 47.16ZM129.314 58.98H137.414V63.3H137.594C138.674 61.5 140.074 60.2 141.794 59.4C143.514 58.56 145.274 58.14 147.074 58.14C149.354 58.14 151.214 58.46 152.654 59.1C154.134 59.7 155.294 60.56 156.134 61.68C156.974 62.76 157.554 64.1 157.874 65.7C158.234 67.26 158.414 69 158.414 70.92V90H149.894V72.48C149.894 69.92 149.494 68.02 148.694 66.78C147.894 65.5 146.474 64.86 144.434 64.86C142.114 64.86 140.434 65.56 139.394 66.96C138.354 68.32 137.834 70.58 137.834 73.74V90H129.314V58.98ZM175.681 58.98H181.921V64.68H175.681V80.04C175.681 81.48 175.921 82.44 176.401 82.92C176.881 83.4 177.841 83.64 179.281 83.64C179.761 83.64 180.221 83.62 180.661 83.58C181.101 83.54 181.521 83.48 181.921 83.4V90C181.201 90.12 180.401 90.2 179.521 90.24C178.641 90.28 177.781 90.3 176.941 90.3C175.621 90.3 174.361 90.2 173.161 90C172.001 89.84 170.961 89.5 170.041 88.98C169.161 88.46 168.461 87.72 167.941 86.76C167.421 85.8 167.161 84.54 167.161 82.98V64.68H162.001V58.98H167.161V49.68H175.681V58.98ZM194.734 54.18H186.214V47.16H194.734V54.18ZM186.214 58.98H194.734V90H186.214V58.98ZM236.903 90H228.143L222.623 69.18H222.503L217.223 90H208.403L198.563 58.98H207.563L213.263 80.04H213.383L218.543 58.98H226.823L232.103 79.98H232.223L237.923 58.98H246.683L236.903 90ZM257.87 74.52C257.87 75.76 257.99 76.98 258.23 78.18C258.47 79.34 258.87 80.4 259.43 81.36C260.03 82.28 260.81 83.02 261.77 83.58C262.73 84.14 263.93 84.42 265.37 84.42C266.81 84.42 268.01 84.14 268.97 83.58C269.97 83.02 270.75 82.28 271.31 81.36C271.91 80.4 272.33 79.34 272.57 78.18C272.81 76.98 272.93 75.76 272.93 74.52C272.93 73.28 272.81 72.06 272.57 70.86C272.33 69.66 271.91 68.6 271.31 67.68C270.75 66.76 269.97 66.02 268.97 65.46C268.01 64.86 266.81 64.56 265.37 64.56C263.93 64.56 262.73 64.86 261.77 65.46C260.81 66.02 260.03 66.76 259.43 67.68C258.87 68.6 258.47 69.66 258.23 70.86C257.99 72.06 257.87 73.28 257.87 74.52ZM249.35 74.52C249.35 72.04 249.73 69.8 250.49 67.8C251.25 65.76 252.33 64.04 253.73 62.64C255.13 61.2 256.81 60.1 258.77 59.34C260.73 58.54 262.93 58.14 265.37 58.14C267.81 58.14 270.01 58.54 271.97 59.34C273.97 60.1 275.67 61.2 277.07 62.64C278.47 64.04 279.55 65.76 280.31 67.8C281.07 69.8 281.45 72.04 281.45 74.52C281.45 77 281.07 79.24 280.31 81.24C279.55 83.24 278.47 84.96 277.07 86.4C275.67 87.8 273.97 88.88 271.97 89.64C270.01 90.4 267.81 90.78 265.37 90.78C262.93 90.78 260.73 90.4 258.77 89.64C256.81 88.88 255.13 87.8 253.73 86.4C252.33 84.96 251.25 83.24 250.49 81.24C249.73 79.24 249.35 77 249.35 74.52ZM286.99 58.98H295.09V64.74H295.21C295.61 63.78 296.15 62.9 296.83 62.1C297.51 61.26 298.29 60.56 299.17 60C300.05 59.4 300.99 58.94 301.99 58.62C302.99 58.3 304.03 58.14 305.11 58.14C305.67 58.14 306.29 58.24 306.97 58.44V66.36C306.57 66.28 306.09 66.22 305.53 66.18C304.97 66.1 304.43 66.06 303.91 66.06C302.35 66.06 301.03 66.32 299.95 66.84C298.87 67.36 297.99 68.08 297.31 69C296.67 69.88 296.21 70.92 295.93 72.12C295.65 73.32 295.51 74.62 295.51 76.02V90H286.99V58.98ZM311.09 47.16H319.61V70.14L330.35 58.98H340.43L328.73 70.38L341.75 90H331.43L322.91 76.14L319.61 79.32V90H311.09V47.16Z"
                        fill={footerTextColor}
                      />
                      <path
                        d="M8.608 8.864H10.648V15.272H10.696C11.032 14.584 11.56 14.088 12.28 13.784C13 13.464 13.792 13.304 14.656 13.304C15.616 13.304 16.448 13.48 17.152 13.832C17.872 14.184 18.464 14.664 18.928 15.272C19.408 15.864 19.768 16.552 20.008 17.336C20.248 18.12 20.368 18.952 20.368 19.832C20.368 20.712 20.248 21.544 20.008 22.328C19.784 23.112 19.432 23.8 18.952 24.392C18.488 24.968 17.896 25.424 17.176 25.76C16.472 26.096 15.648 26.264 14.704 26.264C14.4 26.264 14.056 26.232 13.672 26.168C13.304 26.104 12.936 26 12.568 25.856C12.2 25.712 11.848 25.52 11.512 25.28C11.192 25.024 10.92 24.712 10.696 24.344H10.648V26H8.608V8.864ZM18.208 19.688C18.208 19.112 18.128 18.552 17.968 18.008C17.824 17.448 17.592 16.952 17.272 16.52C16.968 16.088 16.568 15.744 16.072 15.488C15.592 15.232 15.024 15.104 14.368 15.104C13.68 15.104 13.096 15.24 12.616 15.512C12.136 15.784 11.744 16.144 11.44 16.592C11.136 17.024 10.912 17.52 10.768 18.08C10.64 18.64 10.576 19.208 10.576 19.784C10.576 20.392 10.648 20.984 10.792 21.56C10.936 22.12 11.16 22.616 11.464 23.048C11.784 23.48 12.192 23.832 12.688 24.104C13.184 24.36 13.784 24.488 14.488 24.488C15.192 24.488 15.776 24.352 16.24 24.08C16.72 23.808 17.104 23.448 17.392 23C17.68 22.552 17.888 22.04 18.016 21.464C18.144 20.888 18.208 20.296 18.208 19.688ZM33.0346 26H31.1146V24.032H31.0666C30.6346 24.8 30.0826 25.368 29.4106 25.736C28.7386 26.088 27.9466 26.264 27.0346 26.264C26.2186 26.264 25.5386 26.16 24.9946 25.952C24.4506 25.728 24.0106 25.416 23.6746 25.016C23.3386 24.616 23.0986 24.144 22.9546 23.6C22.8266 23.04 22.7626 22.424 22.7626 21.752V13.592H24.8026V21.992C24.8026 22.76 25.0266 23.368 25.4746 23.816C25.9226 24.264 26.5386 24.488 27.3226 24.488C27.9466 24.488 28.4826 24.392 28.9306 24.2C29.3946 24.008 29.7786 23.736 30.0826 23.384C30.3866 23.032 30.6106 22.624 30.7546 22.16C30.9146 21.68 30.9946 21.16 30.9946 20.6V13.592H33.0346V26ZM38.2585 11.36H36.2185V8.864H38.2585V11.36ZM36.2185 13.592H38.2585V26H36.2185V13.592ZM41.5388 8.864H43.5788V26H41.5388V8.864ZM49.5711 13.592H52.0431V15.392H49.5711V23.096C49.5711 23.336 49.5871 23.528 49.6191 23.672C49.6671 23.816 49.7471 23.928 49.8591 24.008C49.9711 24.088 50.1231 24.144 50.3151 24.176C50.5231 24.192 50.7871 24.2 51.1071 24.2H52.0431V26H50.4831C49.9551 26 49.4991 25.968 49.1151 25.904C48.7471 25.824 48.4431 25.688 48.2031 25.496C47.9791 25.304 47.8111 25.032 47.6991 24.68C47.5871 24.328 47.5311 23.864 47.5311 23.288V15.392H45.4191V13.592H47.5311V9.872H49.5711V13.592ZM61.0611 8.864H63.1011V15.272H63.1491C63.4851 14.584 64.0131 14.088 64.7331 13.784C65.4531 13.464 66.2451 13.304 67.1091 13.304C68.0691 13.304 68.9011 13.48 69.6051 13.832C70.3251 14.184 70.9171 14.664 71.3811 15.272C71.8611 15.864 72.2211 16.552 72.4611 17.336C72.7011 18.12 72.8211 18.952 72.8211 19.832C72.8211 20.712 72.7011 21.544 72.4611 22.328C72.2371 23.112 71.8851 23.8 71.4051 24.392C70.9411 24.968 70.3491 25.424 69.6291 25.76C68.9251 26.096 68.1011 26.264 67.1571 26.264C66.8531 26.264 66.5091 26.232 66.1251 26.168C65.7571 26.104 65.3891 26 65.0211 25.856C64.6531 25.712 64.3011 25.52 63.9651 25.28C63.6451 25.024 63.3731 24.712 63.1491 24.344H63.1011V26H61.0611V8.864ZM70.6611 19.688C70.6611 19.112 70.5811 18.552 70.4211 18.008C70.2771 17.448 70.0451 16.952 69.7251 16.52C69.4211 16.088 69.0211 15.744 68.5251 15.488C68.0451 15.232 67.4771 15.104 66.8211 15.104C66.1331 15.104 65.5491 15.24 65.0691 15.512C64.5891 15.784 64.1971 16.144 63.8931 16.592C63.5891 17.024 63.3651 17.52 63.2211 18.08C63.0931 18.64 63.0291 19.208 63.0291 19.784C63.0291 20.392 63.1011 20.984 63.2451 21.56C63.3891 22.12 63.6131 22.616 63.9171 23.048C64.2371 23.48 64.6451 23.832 65.1411 24.104C65.6371 24.36 66.2371 24.488 66.9411 24.488C67.6451 24.488 68.2291 24.352 68.6931 24.08C69.1731 23.808 69.5571 23.448 69.8451 23C70.1331 22.552 70.3411 22.04 70.4691 21.464C70.5971 20.888 70.6611 20.296 70.6611 19.688ZM80.0877 27.656C79.8477 28.264 79.6077 28.776 79.3677 29.192C79.1437 29.608 78.8877 29.944 78.5997 30.2C78.3277 30.472 78.0157 30.664 77.6637 30.776C77.3277 30.904 76.9357 30.968 76.4877 30.968C76.2477 30.968 76.0077 30.952 75.7677 30.92C75.5277 30.888 75.2957 30.832 75.0717 30.752V28.88C75.2477 28.96 75.4477 29.024 75.6717 29.072C75.9117 29.136 76.1117 29.168 76.2717 29.168C76.6877 29.168 77.0317 29.064 77.3037 28.856C77.5917 28.664 77.8077 28.384 77.9517 28.016L78.7917 25.928L73.8717 13.592H76.1757L79.7997 23.744H79.8477L83.3277 13.592H85.4877L80.0877 27.656Z"
                        fill={footerTextColor}
                      />
                      <path d="M57 91L41.4115 47.5L72.5885 47.5L57 91Z" fill={footerTextColor} />
                      <path d="M25 91L9.41154 47.5L40.5885 47.5L25 91Z" fill={footerTextColor} />
                    </svg>
                  </a>
                  Project
                </div>
              </div>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
