"use client";

import {
  Archive,
  ArrowRight,
  Banknote,
  BookOpen,
  CheckCircle,
  Clock,
  FileCode,
  Globe,
  Mail,
  MessageSquare,
  Monitor,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getBaseUrl } from "@/lib/utils";
import { Button } from "../components/ui/button";
import ComparisonHistogram from "./comparisonHistogram";
import { ContactModal } from "./contactModal";
import { MarketingHeader } from "./marketingHeader";
import SlackInterface from "./slackInterface";

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
  const [showContactModal, setShowContactModal] = useState(false);
  const [activeTab, setActiveTab] = useState("web");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleContactSuccess = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

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
    // Scroll to the knowledge section (first section after hero)
    const sections = document.querySelectorAll("section");
    if (sections.length > 1) {
      const targetSection = sections[1];
      const rect = targetSection.getBoundingClientRect();
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
        <section className="flex items-center justify-center min-h-screen pt-16">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl sm:text-4xl font-bold mb-2 sm:mb-3 text-center text-secondary dark:text-foreground pt-4">
              Deliver stellar support experiences.
            </h1>
            <p className="text-base text-sm md:text-lg text-center text-secondary dark:text-foreground mb-4">
              A native, end-to-end support center with custom UI, zero margin on model costs, and data that always stays
              on your servers.{" "}
            </p>

            <div className="w-full max-w-4xl mx-auto pt-2">
              {/* Tab Navigation */}
              <div className="flex justify-center mb-6">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("web")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                      activeTab === "web"
                        ? "bg-[#2B0808] border-2 border-[#459EFD] text-[#FFE6B0]"
                        : "bg-[#3B1B1B] text-[#FFE6B0] hover:bg-[#4B2B2B]"
                    }`}
                  >
                    <Globe className="w-4 h-4" style={{ color: activeTab === "web" ? "#459EFD" : "#FFE6B0" }} />
                    Web
                  </button>
                  <button
                    onClick={() => setActiveTab("inbox")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                      activeTab === "inbox"
                        ? "bg-[#2B0808] border-2 border-[#FF90E8] text-[#FFE6B0]"
                        : "bg-[#3B1B1B] text-[#FFE6B0] hover:bg-[#4B2B2B]"
                    }`}
                  >
                    <Mail className="w-4 h-4" style={{ color: activeTab === "inbox" ? "#FF90E8" : "#FFE6B0" }} />
                    Inbox
                  </button>
                  <button
                    onClick={() => setActiveTab("slack")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                      activeTab === "slack"
                        ? "bg-[#2B0808] border-2 border-[#FF4343] text-[#FFE6B0]"
                        : "bg-[#3B1B1B] text-[#FFE6B0] hover:bg-[#4B2B2B]"
                    }`}
                  >
                    <img src="slack-logo-icon.png" alt="Slack" className="w-4 h-4" />
                    Slack
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="rounded-2xl shadow-2xl overflow-hidden h-[60vh]">
                {activeTab === "web" && (
                  <iframe
                    style={{ zoom: 0.8 }}
                    src="https://gumroad.com/help"
                    className="w-full h-full border-16 border-[#3B1B1B] dark:border-[#3B1B1B]"
                    title="Gumroad Help Center"
                    allow="fullscreen"
                  />
                )}
                {activeTab === "inbox" && (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src="Helper-inbox-desktop.png"
                        alt="Helper Inbox Desktop"
                        className="hidden md:block w-full h-full object-contain"
                      />
                      <img
                        src="Helper-inbox-mobile.png"
                        alt="Helper Inbox Mobile"
                        className="block md:hidden w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
                {activeTab === "slack" && (
                  <div className="h-full flex items-center justify-center p-4">
                    <SlackInterface />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-4 mt-6">
              <Button
                onClick={scrollToFeatures}
                className="bg-[#3B1B1B] dark:bg-[#3B1B1B] hover:bg-[#4B2B2B] text-[#FFE6B0] dark:text-[#FFE6B0] hover:text-[#FFE6B0] font-medium px-6 py-3 rounded-lg text-base transition-colors duration-200"
              >
                Learn more
              </Button>
              <Button
                onClick={() => setShowContactModal(true)}
                className="bg-bright hover:bg-[#FFE6B0] text-[#2B0808] hover:text-[#2B0808] font-medium px-6 py-3 rounded-lg text-base transition-colors duration-200"
              >
                Contact sales
              </Button>
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
                onClick={() => setShowContactModal(true)}
                className="bg-bright hover:bg-[#FFE6B0] text-[#2B0808] hover:text-[#2B0808] font-medium px-6 py-3 rounded-lg text-base transition-colors duration-200"
              >
                Contact sales
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

        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold mb-12 text-center text-secondary dark:text-foreground">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              <div className="bg-gradient-to-br from-bright to-[#FFD34E] rounded-2xl p-16 relative overflow-hidden flex flex-col h-full min-h-[500px]">
                <div className="text-[#2B0808] flex flex-col h-full">
                  <div className="text-5xl font-bold mb-8">$10,000+</div>
                  <p className="text-md mb-4">
                    One-time, white-glove installation fee including custom features to build an exceptional customer
                    support experience.
                  </p>
                  <ul className="space-y-3 mb-8 flex-grow">
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-[#2B0808] mr-3" />
                      Native, in-app support center
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-[#2B0808] mr-3" />
                      Data stays on your servers
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-[#2B0808] mr-3" />
                      Zero markup on model costs
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-[#2B0808] mr-3" />
                      Custom UI tailored to your business needs
                    </li>
                  </ul>
                  <Button
                    onClick={() => setShowContactModal(true)}
                    className="w-full bg-[#2B0808] dark:bg-[#2B0808] hover:bg-[#3B1B1B] text-white dark:text-white font-medium px-6 py-3 rounded-lg transition-colors mt-auto cursor-pointer"
                  >
                    Contact sales
                  </Button>
                </div>
              </div>

              <div className="bg-[#3B1B1B] rounded-2xl p-16 flex flex-col h-full min-h-[500px]">
                <div className="text-[#FFE6B0] flex flex-col h-full">
                  <div className="text-5xl font-bold mb-8">$0</div>
                  <p className="text-md mb-4">
                    Leverage our open-source code to set up your own customer support solution.
                  </p>
                  <ul className="space-y-3 mb-8 flex-grow">
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-[#FFE6B0] mr-3" />
                      Extend and customize as needed
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-[#FFE6B0] mr-3" />
                      Backed by an active community
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-[#FFE6B0] mr-3" />
                      Built with modern tooling
                    </li>
                  </ul>
                  <Button
                    asChild
                    className="w-full bg-[#2B0808] dark:bg-[#2B0808] hover:bg-[#4B2B2B] text-white dark:text-white hover:text-white font-medium px-6 py-3 rounded-lg transition-colors mt-auto cursor-pointer"
                  >
                    <Link href="https://github.com/antiwork/helper" className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      Get started
                    </Link>
                  </Button>
                </div>
              </div>
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

      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSuccess={handleContactSuccess}
      />
    </main>
  );
}
