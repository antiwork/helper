"use client";

import {
  Archive,
  ArrowRight,
  Banknote,
  BookOpen,
  BookOpen as BookOpenIcon,
  Clock,
  FileCode,
  MessageSquare,
  Monitor,
  MousePointer,
  PlayCircle,
  Sparkles,
  Star,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getBaseUrl } from "@/lib/utils";
import { Button } from "../components/ui/button";
import AnimatedTyping from "./animatedTyping";
import CitationsDemo from "./citationsDemo";
import ComparisonHistogram from "./comparisonHistogram";
import LogoIconAmber from "./logoIconAmber.svg";
import { MarketingHeader } from "./marketingHeader";
import RefundDemo from "./refundDemo";
import SlackInterface from "./slackInterface";
import SlackNotification from "./slackNotification";
import ToolsDemo from "./toolsDemo";

export default function Home() {
  const [customerQuestions] = useState([
    "How can Helper transform my customer support?",
    "How can Helper cut my response time in half?",
    "Can Helper integrate with our existing tools?",
    "How does Helper handle complex customer issues?",
    "Will Helper reduce our support team's workload?",
  ]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [showCustomerMessage, setShowCustomerMessage] = useState(false);
  const [showHelperMessage, setShowHelperMessage] = useState(false);
  const [customerTypingComplete, setCustomerTypingComplete] = useState(false);
  const [helperTypingComplete, setHelperTypingComplete] = useState(false);
  const [showHelperButton, setShowHelperButton] = useState(false);
  const showMeButtonRef = useRef<HTMLButtonElement>(null);
  const helperMessageRef = useRef<HTMLDivElement>(null);

  const [currentSlide, setCurrentSlide] = useState(0);

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
      }, 500);
      return () => clearTimeout(buttonTimer);
    }
  }, [helperTypingComplete]);

  const scrollToFeatures = () => {
    const smarterSupportSection = document.getElementById("smarter-support");
    if (smarterSupportSection) {
      const rect = smarterSupportSection.getBoundingClientRect();
      const targetScrollY = window.scrollY + rect.top - 40;
      window.scrollTo({
        top: targetScrollY,
        behavior: "smooth",
      });
    }
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
      setCurrentSlide((prev) => (prev === 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [currentSlide]);

  const docsBaseUrl = getBaseUrl().includes("localhost") ? "http://localhost:3011" : "https://helper.ai";

  return (
    <main className="bg-[#2B0808] text-white flex flex-col">
      <MarketingHeader bgColor="#2B0808" />

      <div className="flex-grow">
        <section className="flex items-center justify-center h-dvh pt-20">
          <div className="container mx-auto px-4">
            <h1 className="text-5xl sm:text-6xl font-bold mb-12 sm:mb-24 text-center text-secondary dark:text-foreground">
              Helper helps customers help themselves.
            </h1>

            <div className="max-w-lg mx-auto">
              {showCustomerMessage && (
                <motion.div
                  className="flex justify-end mb-4 sm:mb-8"
                  initial={{ opacity: 0, y: 20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  transition={{ duration: 0.5, height: { duration: 0.6, ease: "easeOut" } }}
                  style={{ overflow: "hidden" }}
                  layout
                >
                  <div className="max-w-md w-full">
                    <motion.div
                      className="bg-[rgba(99,72,71,0.3)] rounded-t-2xl rounded-bl-2xl p-6 shadow-md min-h-[80px] flex items-center"
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      {customerQuestions[currentQuestionIndex] && (
                        <AnimatedTyping
                          text={customerQuestions[currentQuestionIndex]}
                          speed={30}
                          onComplete={handleCustomerTypingComplete}
                        />
                      )}
                    </motion.div>
                    <div className="flex justify-end mt-2"></div>
                  </div>
                </motion.div>
              )}

              {showHelperMessage && (
                <motion.div
                  className="flex mb-8"
                  initial={{ opacity: 0, y: 20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  transition={{ duration: 0.5, height: { duration: 0.6, ease: "easeOut" } }}
                  style={{ overflow: "hidden" }}
                  layout
                >
                  <div className="w-96">
                    <motion.div
                      ref={helperMessageRef}
                      className="bg-[rgba(99,72,71,0.3)] rounded-t-2xl rounded-br-2xl p-6 shadow-md"
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <AnimatedTyping
                        text="Let me show you how I can help..."
                        speed={50}
                        onComplete={handleHelperTypingComplete}
                      />
                      {showHelperButton && (
                        <motion.div
                          className="mt-4"
                          initial={{ opacity: 0, y: 10, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: "auto" }}
                          transition={{ duration: 0.3, delay: 0.2, height: { duration: 0.4, ease: "easeOut" } }}
                          style={{ overflow: "hidden" }}
                        >
                          <Button
                            ref={showMeButtonRef}
                            onClick={scrollToFeatures}
                            className="bg-bright hover:bg-[#FFEDC2] text-black hover:text-black font-medium px-8 py-6 rounded-md text-lg transition-colors duration-200"
                          >
                            Take the tour
                          </Button>
                        </motion.div>
                      )}
                    </motion.div>
                    <motion.div
                      className="flex justify-start mt-2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.4, delay: 0.3, height: { duration: 0.4, ease: "easeOut" } }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="w-8 h-8">
                        <LogoIconAmber />
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        <section id="smarter-support" className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-16 gap-0 items-start">
              <div className="lg:sticky lg:top-20">
                <h2 className="text-4xl md:text-5xl font-bold mb-8 text-secondary dark:text-foreground text-left">
                  Helper guides users and resolves issues before they become tickets.
                </h2>
                <div className="space-y-6 mb-12 mt-8">
                  <div className="flex items-start gap-4 md:items-center">
                    <MousePointer className="w-6 h-6 text-amber-400" />
                    <span>
                      <span className="font-bold text-bright">Helping hand</span>
                      <span className="text-secondary dark:text-foreground">
                        {" "}
                        shows your customers how, instead of telling them.
                      </span>
                    </span>
                  </div>
                  <div className="flex items-start gap-4 md:items-center">
                    <BookOpenIcon className="w-6 h-6" style={{ color: "#459EFD" }} />
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
                  <div className="flex items-start gap-4 md:items-center">
                    <PlayCircle className="w-6 h-6" style={{ color: "#FF90E8" }} />
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
                <Button
                  className="bg-bright hover:bg-[#FFEDC2] text-black hover:text-black font-medium px-8 py-6 rounded-md text-lg transition-colors duration-200"
                  asChild
                >
                  <Link href="https://github.com/antiwork/helper">Get started</Link>
                </Button>
              </div>

              <div className="order-1 md:order-2">
                <div className="flex flex-col gap-24">
                  <RefundDemo />
                  <div className="hidden lg:block">
                    <CitationsDemo />
                  </div>
                  <div className="hidden lg:block">
                    <ToolsDemo />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mb-24 text-left max-w-5xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-secondary dark:text-foreground text-left xl:text-center">
                Helper delivers fast, accurate support by deeply understanding your content.
              </h2>
              <p className="text-lg md:text-xl text-secondary dark:text-foreground text-left xl:text-center mx-auto">
                Website Knowledge syncs Helper with your site automatically. Knowledge Bank lets agents add answers on
                the fly. Together, they keep info consistent, speed up replies, and update as your policies change.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-6 items-center md:items-stretch">
              <div className="relative flex flex-col items-center md:items-end h-full px-4 md:px-0">
                <div className="bg-[#3B1B1B] rounded-3xl p-8 max-w-xl w-full mx-auto h-full flex flex-col justify-between mt-8 md:mt-0">
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
                    <div className="flex-1 flex items-center bg-[#3B1B1B] rounded-2xl px-6 py-4">
                      <Banknote className="w-6 h-6 text-[#FFD34E] mr-3" />
                      <span className="text-base md:text-lg text-[#FFE6B0] font-medium">
                        What's your refund policy?
                      </span>
                    </div>
                    <div className="flex-1 flex items-center bg-[#3B1B1B] rounded-2xl px-6 py-4">
                      <Archive className="w-6 h-6 text-[#459EFD] mr-3" />
                      <span className="text-base md:text-lg text-[#FFE6B0] font-medium">Can I expedite shipping?</span>
                    </div>
                    <div className="flex-1 flex items-center bg-[#3B1B1B] rounded-2xl px-6 py-4">
                      <Trash2 className="w-6 h-6 text-[#FF4343] mr-3" />
                      <span className="text-base md:text-lg text-[#FFE6B0] font-medium">
                        How do I delete my account?
                      </span>
                    </div>
                    <div className="flex-1 flex items-center bg-[#3B1B1B] rounded-2xl px-6 py-4">
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

        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-1 xl:grid-cols-2 xl:gap-16 gap-0 items-start">
              <div className="md:static xl:sticky xl:top-20">
                <h2 className="text-4xl md:text-5xl font-bold mb-8 text-secondary dark:text-foreground text-left">
                  Helper steps back when humans need to step in.
                </h2>
                <p className="text-lg text-secondary dark:text-foreground mb-8 text-left">
                  Get notified in Slack when complex or high-priority issues arise, use @helper to quickly surface
                  context, and easily return tickets to Helper once your team has resolved the issue.
                </p>
                <div className="space-y-6 mb-12">
                  <div className="flex items-start gap-4 md:items-center">
                    <TriangleAlert className="w-6 h-6" style={{ color: "#FF4343" }} />
                    <span>
                      <span className="font-bold" style={{ color: "#FF4343" }}>
                        Smart escalation
                      </span>
                      <span className="text-secondary dark:text-foreground"> to human agents for complex issues.</span>
                    </span>
                  </div>
                  <div className="flex items-start gap-4 md:items-center">
                    <Sparkles className="w-6 h-6" style={{ color: "#C2D44B" }} />
                    <span>
                      <span className="font-bold" style={{ color: "#C2D44B" }}>
                        @helper
                      </span>
                      <span className="text-secondary dark:text-foreground">
                        {" "}
                        commands for quick information retrieval.
                      </span>
                    </span>
                  </div>
                  <div className="flex items-start gap-4 md:items-center">
                    <Star className="w-6 h-6" style={{ color: "#FEB81D" }} />
                    <span>
                      <span className="font-bold" style={{ color: "#FEB81D" }}>
                        Priority notifications
                      </span>
                      <span className="text-secondary dark:text-foreground"> for VIP customers.</span>
                    </span>
                  </div>
                </div>
                <Button
                  className="bg-bright hover:bg-[#FFEDC2] text-black hover:text-black font-medium px-8 py-6 rounded-md text-lg transition-colors duration-200"
                  asChild
                >
                  <Link href="https://github.com/antiwork/helper">Get started</Link>
                </Button>
              </div>
              <div className="space-y-12">
                <div id="slackInterface" className="hidden xl:block">
                  <SlackInterface />
                </div>
                <div id="slackNotification" className="hidden xl:block">
                  <SlackNotification />
                </div>
                <div className="xl:hidden mt-12">
                  <div className="relative">
                    <div className="overflow-hidden">
                      <div
                        className="flex transition-transform duration-300 ease-in-out"
                        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                      >
                        <div className="w-full flex-shrink-0">
                          <SlackInterface />
                        </div>
                        <div className="w-full flex-shrink-0">
                          <SlackNotification />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center gap-2 mt-4">
                      <button
                        onClick={() => setCurrentSlide(0)}
                        className={`w-2 h-2 rounded-full ${currentSlide === 0 ? "bg-[#FEB81D]" : "bg-[#FEB81D]/30"}`}
                        aria-label="Show Slack interface slide"
                        aria-pressed={currentSlide === 0}
                      />
                      <button
                        onClick={() => setCurrentSlide(1)}
                        className={`w-2 h-2 rounded-full ${currentSlide === 1 ? "bg-[#FEB81D]" : "bg-[#FEB81D]/30"}`}
                        aria-label="Show Slack notification slide"
                        aria-pressed={currentSlide === 1}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="mb-24 text-left  max-w-5xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-secondary dark:text-foreground text-left xl:text-center">
                Measure your success
              </h2>
              <p className="text-lg md:text-xl text-secondary dark:text-foreground text-left xl:text-center mx-auto">
                Helper provides comprehensive analytics to track the impact on your support operations. See faster
                response times, improved customer sentiment, and happier support agents.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch h-full min-h-[480px] ">
              <div className="md:col-span-2 flex flex-col justify-between h-full">
                <div className="text-center"></div>
                <div className="h-full">
                  <ComparisonHistogram />
                </div>
              </div>
              <div className="flex flex-col gap-8 h-full">
                <div className="bg-[rgba(99,72,71,0.3)] rounded-2xl p-8 flex-1 flex flex-col justify-between h-full">
                  <div className="text-center mb-2">
                    <div className="text-3xl font-bold text-[#FFE6B0] mb-1">Customer sentiment</div>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <img src="/customer-sentiment.svg" alt="Customer sentiment" className="w-full max-w-xs" />
                  </div>
                </div>
                <div className="bg-[rgba(99,72,71,0.3)] rounded-2xl p-8 flex-1 flex flex-col items-center justify-center h-full">
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
              <Button
                className="bg-bright hover:bg-[#FFEDC2] text-black hover:text-black font-medium px-8 py-6 rounded-md text-lg transition-colors duration-200"
                asChild
              >
                <Link href="https://github.com/antiwork/helper">Get started</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="w-full py-20 bg-[#2B0808] dark:bg-[#2B0808]">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold mb-12">Knowledge base</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Link
                href={`${docsBaseUrl}/docs`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-[#3B1B1B] dark:bg-[#3B1B1B] rounded-2xl p-8 transition-transform hover:-rotate-2 hover:shadow-xl group"
                style={{ boxShadow: "none" }}
              >
                <span className="flex items-center justify-center w-10 h-10">
                  <BookOpen className="w-6 h-6" style={{ color: "#459EFD" }} />
                </span>
                <span className="text-lg font-bold" style={{ color: "#FFE6B0" }}>
                  Getting started
                </span>
                <span className="ml-auto" style={{ color: "#FFE6B0" }}>
                  <ArrowRight className="w-6 h-6" />
                </span>
              </Link>
              <Link
                href={`${docsBaseUrl}/docs/tools/01-overview`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-[#3B1B1B] dark:bg-[#3B1B1B] rounded-2xl p-8 transition-transform hover:-rotate-2 hover:shadow-xl group"
                style={{ boxShadow: "none" }}
              >
                <span className="flex items-center justify-center w-10 h-10">
                  <Clock className="w-6 h-6" style={{ color: "#C2D44B" }} />
                </span>
                <span className="text-lg font-bold" style={{ color: "#FFE6B0" }}>
                  Tools
                </span>
                <span className="ml-auto" style={{ color: "#FFE6B0" }}>
                  <ArrowRight className="w-6 h-6" />
                </span>
              </Link>
              <Link
                href={`${docsBaseUrl}/docs/api/01-overview`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-[#3B1B1B] dark:bg-[#3B1B1B] rounded-2xl p-8 transition-transform hover:-rotate-2 hover:shadow-xl group"
                style={{ boxShadow: "none" }}
              >
                <span className="flex items-center justify-center w-10 h-10">
                  <MessageSquare className="w-6 h-6" style={{ color: "#FF90E8" }} />
                </span>
                <span className="text-lg font-bold" style={{ color: "#FFE6B0" }}>
                  Conversation API
                </span>
                <span className="ml-auto" style={{ color: "#FFE6B0" }}>
                  <ArrowRight className="w-6 h-6" />
                </span>
              </Link>
              <Link
                href={`${docsBaseUrl}/docs/api/api-reference/create-conversation`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-[#3B1B1B] dark:bg-[#3B1B1B] rounded-2xl p-8 transition-transform hover:-rotate-2 hover:shadow-xl group"
                style={{ boxShadow: "none" }}
              >
                <span className="flex items-center justify-center w-10 h-10">
                  <FileCode className="w-6 h-6" style={{ color: "#FF4343" }} />
                </span>
                <span className="text-lg font-bold" style={{ color: "#FFE6B0" }}>
                  API reference
                </span>
                <span className="ml-auto" style={{ color: "#FFE6B0" }}>
                  <ArrowRight className="w-6 h-6" />
                </span>
              </Link>
              <Link
                href={`${docsBaseUrl}/docs/widget/01-overview`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-[#3B1B1B] dark:bg-[#3B1B1B] rounded-2xl p-8 transition-transform hover:-rotate-2 hover:shadow-xl group"
                style={{ boxShadow: "none" }}
              >
                <span className="flex items-center justify-center w-10 h-10">
                  <Monitor className="w-6 h-6" style={{ color: "#FFD34E" }} />
                </span>
                <span className="text-lg font-bold" style={{ color: "#FFE6B0" }}>
                  Chat widget
                </span>
                <span className="ml-auto" style={{ color: "#FFE6B0" }}>
                  <ArrowRight className="w-6 h-6" />
                </span>
              </Link>
            </div>
          </div>
        </section>
        <footer className="bottom-0 left-0 right-0 w-full h-24 pl-5 pb-5" style={{ backgroundColor: "#2B0808" }}>
          <div className="flex items-center">
            <a href="https://antiwork.com/" target="_blank" rel="noopener noreferrer">
              <svg width="200" height="40" viewBox="0 0 500 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M57 91L41.4115 47.5L72.5885 47.5L57 91Z" fill={"#FFFFFF"} />
                <path d="M25 91L9.41154 47.5L40.5885 47.5L25 91Z" fill={"#FFFFFF"} />
              </svg>
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
