"use client"

import { useState, useEffect, useRef } from "react"
import AnimatedCursor from "@/components/animated-cursor"
import MessageBubble from "@/components/message-bubble"
import SlackInterface from "@/components/slack-interface"
import SlackNotification from "@/components/slack-notification"
import ResponseTimeChart from "@/components/response-time-chart"
import ComparisonHistogram from "@/components/comparison-histogram"
import { Button } from "@/components/ui/button"
import Image from "next/image"

// Define the position configurations for each feature
type PositionConfig = {
  bubbleVariant: "topLeft" | "topRight" | "bottomLeft" | "bottomRight"
  labelPosition: "left" | "right" | "top" | "bottom"
}

const featurePositions: Record<string, PositionConfig> = {
  smarterSupport: { bubbleVariant: "bottomLeft", labelPosition: "top" },
  knowledgeBank: { bubbleVariant: "bottomRight", labelPosition: "right" },
  messageReactions: { bubbleVariant: "bottomRight", labelPosition: "right" },
  shorthandReplies: { bubbleVariant: "bottomRight", labelPosition: "top" },
  slackInterface: { bubbleVariant: "bottomLeft", labelPosition: "top" },
  slackNotification: { bubbleVariant: "bottomLeft", labelPosition: "top" },
  responseTimeChart: { bubbleVariant: "bottomRight", labelPosition: "bottom" },
  finalToggle: { bubbleVariant: "bottomRight", labelPosition: "left" },
}

export default function Home() {
  // Update the state variables at the top of the component
  // Add a new state for cycling through questions
  const [customerQuestions, setCustomerQuestions] = useState([
    "How can Helper transform my customer support?",
    "How can Helper cut my response time in half?",
    "Can Helper integrate with our existing tools?",
    "How does Helper handle complex customer issues?",
    "Will Helper reduce our support team's workload?",
  ])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [nextQuestionIndex, setNextQuestionIndex] = useState(1)
  const [isAnimating, setIsAnimating] = useState(false)

  // Change these to be true by default
  const [showCustomerMessage, setShowCustomerMessage] = useState(true)
  const [showHelperMessage, setShowHelperMessage] = useState(true)
  const [showCursor, setShowCursor] = useState(true)
  const [showFeatures, setShowFeatures] = useState(false)
  const [activeBubble, setActiveBubble] = useState<string | null>(null)
  const [cursorPosition, setCursorPosition] = useState({ x: 80, y: 450 }) // Initial position to the left of the message
  const [customerTypingComplete, setCustomerTypingComplete] = useState(false)
  const [helperTypingComplete, setHelperTypingComplete] = useState(false)
  const [showHelperButton, setShowHelperButton] = useState(false)
  const [cursorAnimating, setCursorAnimating] = useState(true)
  const [stopCursorAnimation, setStopCursorAnimation] = useState(false)
  const [showSpotlight, setShowSpotlight] = useState(true)
  const showMeButtonRef = useRef<HTMLButtonElement>(null)
  const animationRef = useRef<NodeJS.Timeout | null>(null)
  const lastActiveFeature = useRef<string | null>(null)
  const initialScrollComplete = useRef(false)
  const helperMessageRef = useRef<HTMLDivElement>(null)

  // Current position configuration
  const [currentPositionConfig, setCurrentPositionConfig] = useState<PositionConfig>({
    bubbleVariant: "topRight",
    labelPosition: "left",
  })

  // Add a useEffect for cycling through questions
  useEffect(() => {
    // Add keyframe animation for sliding in from bottom
    if (typeof document !== "undefined") {
      const style = document.createElement("style")
      style.innerHTML = `
        @keyframes fadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        
        @keyframes slideIn {
          0% { 
            transform: translateY(20px);
            opacity: 0;
          }
          100% { 
            transform: translateY(0);
            opacity: 1;
          }
        }
      `
      document.head.appendChild(style)
    }

    const rotateQuestions = () => {
      // Start animation
      setIsAnimating(true)

      // After animation completes, update indices
      animationRef.current = setTimeout(() => {
        setCurrentQuestionIndex(nextQuestionIndex)
        setNextQuestionIndex((nextQuestionIndex + 1) % customerQuestions.length)
        setIsAnimating(false)
      }, 500)
    }

    // Set up interval for question rotation
    const questionInterval = setInterval(rotateQuestions, 5000)

    return () => {
      clearInterval(questionInterval)
      if (animationRef.current) {
        clearTimeout(animationRef.current)
      }
    }
  }, [customerQuestions, nextQuestionIndex])

  // Position the cursor next to the helper message
  useEffect(() => {
    if (helperMessageRef.current) {
      const rect = helperMessageRef.current.getBoundingClientRect()
      setCursorPosition({ x: rect.left - 40, y: rect.top + rect.height / 2 })
    }
  }, [helperTypingComplete])

  // With this simplified version that just shows the helper button after a delay:
  useEffect(() => {
    // Just show the helper button after a short delay
    setTimeout(() => {
      setHelperTypingComplete(true)
    }, 1000)
  }, [])

  // Show button after helper typing is complete
  useEffect(() => {
    if (helperTypingComplete) {
      setTimeout(() => {
        setShowHelperButton(true)
      }, 500)
    }
  }, [helperTypingComplete])

  // Handle cursor movement to features
  useEffect(() => {
    if (!showFeatures) return

    // Stop the cursor animation when features are shown
    setStopCursorAnimation(true)

    // Turn off spotlight when tour starts
    setShowSpotlight(false)

    const handleScroll = () => {
      const scrollY = window.scrollY
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const viewportMiddle = scrollY + viewportHeight / 2

      // Find which feature is currently in view
      const featureElements = {
        smarterSupport: document.getElementById("smarter-support"),
        knowledgeBank: document.getElementById("knowledgeBank"),
        messageReactions: document.getElementById("messageReactions"),
        shorthandReplies: document.getElementById("shorthandReplies"),
        slackInterface: document.getElementById("slackInterface"),
        slackNotification: document.getElementById("slackNotification"),
        responseTimeChart: document.getElementById("responseTimeChart"),
      }

      // Track the closest element to the middle of the viewport
      let closestElement: HTMLElement | null = null
      let closestDistance = Number.POSITIVE_INFINITY
      let closestFeature = ""

      // Check each feature element
      for (const [feature, element] of Object.entries(featureElements)) {
        if (element) {
          const rect = element.getBoundingClientRect()
          const elementTop = scrollY + rect.top
          const elementMiddle = elementTop + rect.height / 2
          const distance = Math.abs(viewportMiddle - elementMiddle)

          // If this element is closer to the middle than the previous closest
          if (distance < closestDistance) {
            closestDistance = distance
            closestElement = element
            closestFeature = feature
          }
        }
      }

      // If we found a closest element and it's different from the last active feature
      if (closestElement && closestFeature !== lastActiveFeature.current) {
        const rect = closestElement.getBoundingClientRect()

        // Define varied positions for each feature
        let cursorX = rect.left
        let cursorY = scrollY + rect.top + rect.height / 2

        // Customize positions based on the feature
        switch (closestFeature) {
          case "smarterSupport":
            const dashboardImage = document.querySelector("#smarter-support img")
            if (dashboardImage) {
              const imageRect = dashboardImage.getBoundingClientRect()
              cursorX = imageRect.left - 10
              cursorY = scrollY + imageRect.top + imageRect.height / 2 + 160
            }
            break
          case "knowledgeBank":
            const knowledgeBankImg = document.querySelector("#knowledgeBank img")
            if (knowledgeBankImg) {
              const imgRect = knowledgeBankImg.getBoundingClientRect()
              cursorX = imgRect.right - 5
              cursorY = scrollY + imgRect.top + imgRect.height / 2 + 130
            }
            break
          case "messageReactions":
            const reactionsImg = document.querySelector("#messageReactions img")
            if (reactionsImg) {
              const imgRect = reactionsImg.getBoundingClientRect()
              cursorX = imgRect.right - 5
              cursorY = scrollY + imgRect.top + imgRect.height / 2 + 130
            }
            break
          case "shorthandReplies":
            const shorthandImg = document.querySelector("#shorthandReplies img")
            if (shorthandImg) {
              const imgRect = shorthandImg.getBoundingClientRect()
              cursorX = imgRect.right - 5
              cursorY = scrollY + imgRect.top + imgRect.height / 2 + 130
            }
            break
          case "slackInterface":
            const slackInterface = document.querySelector("#slackInterface")
            if (slackInterface) {
              const interfaceRect = slackInterface.getBoundingClientRect()
              cursorX = interfaceRect.left - 10
              cursorY = scrollY + interfaceRect.top + interfaceRect.height / 2
            }
            break
          case "slackNotification":
            const notification = document.querySelector("#slackNotification")
            if (notification) {
              const notificationRect = notification.getBoundingClientRect()
              cursorX = notificationRect.left - 10
              cursorY = scrollY + notificationRect.top + notificationRect.height / 2
            }
            break
          case "responseTimeChart":
            const chart = document.querySelector("#responseTimeChart")
            if (chart) {
              const chartRect = chart.getBoundingClientRect()
              cursorX = chartRect.left + 20
              cursorY = scrollY + chartRect.top + chartRect.height / 2 + 40
            }
            break
        }

        // Fallback to section positioning if no specific element found
        if (!cursorX || !cursorY) {
          cursorX = rect.left + 60
          cursorY = scrollY + rect.top + rect.height / 2
        }

        // Ensure cursor is not cut off on the left
        cursorX = Math.max(cursorX, 60)

        // Ensure cursor is not cut off on the right
        cursorX = Math.min(cursorX, viewportWidth - 60)

        setCursorPosition({ x: cursorX, y: cursorY })
        setActiveBubble(closestFeature)

        // Set the position configuration for this feature
        if (featurePositions[closestFeature]) {
          setCurrentPositionConfig(featurePositions[closestFeature])
        }

        lastActiveFeature.current = closestFeature
      }

      // Check for final toggle section
      const finalToggle = document.querySelector("#finalToggle")
      if (finalToggle) {
        const rect = finalToggle.getBoundingClientRect()
        const switchElement = finalToggle.querySelector('[role="switch"]')

        if (switchElement) {
          const switchRect = switchElement.getBoundingClientRect()
          if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
            setCursorPosition({
              x: switchRect.left + switchRect.width / 2 - 20,
              y: window.scrollY + switchRect.top + switchRect.height / 2 + 25,
            })
            setActiveBubble("finalToggle")
            setCurrentPositionConfig(featurePositions.finalToggle)
          }
        }
      }
    }

    // Initial positioning
    setTimeout(handleScroll, 100)

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [showFeatures])

  // Start guided tour when "Show Me" is clicked
  useEffect(() => {
    if (showFeatures && !initialScrollComplete.current) {
      const timer = setTimeout(() => {
        // Find the Smarter Support section first
        const smarterSupportSection = document.getElementById("smarter-support")
        if (smarterSupportSection) {
          // Calculate position to center the Smarter Support section
          const rect = smarterSupportSection.getBoundingClientRect()
          const targetScrollY = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2

          // Scroll to position the Smarter Support section in the center
          window.scrollTo({
            top: targetScrollY,
            behavior: "smooth",
          })

          // Set the initial active bubble
          setTimeout(() => {
            setActiveBubble("smarterSupport")

            // Set the position configuration for the first feature
            setCurrentPositionConfig(featurePositions.smarterSupport)

            // Find the image container
            const dashboardImage = smarterSupportSection.querySelector("img")
            if (dashboardImage) {
              const imageRect = dashboardImage.getBoundingClientRect()
              // Position cursor on the left side of the image
              const cursorX = imageRect.left - 10
              const cursorY = window.scrollY + imageRect.top + imageRect.height / 2 + 160
              setCursorPosition({ x: cursorX, y: cursorY })
            } else {
              // Fallback positioning
              const rect = smarterSupportSection.getBoundingClientRect()
              const cursorX = rect.left - 10
              const cursorY = window.scrollY + rect.top + rect.height / 2 + 160
              setCursorPosition({ x: cursorX, y: cursorY })
            }

            initialScrollComplete.current = true
          }, 800) // Wait for scroll to complete
        }
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [showFeatures])

  // Handle the "Show Me" button click
  const handleShowMe = () => {
    setShowFeatures(true)
    initialScrollComplete.current = false
  }

  // Handle typing completion for customer
  const handleCustomerTypingComplete = () => {
    setCustomerTypingComplete(true)
  }

  // Handle typing completion for helper
  const handleHelperTypingComplete = () => {
    setHelperTypingComplete(true)
  }

  return (
    <main className="min-h-screen bg-[#2B0808] text-white">
      {/* Animated Cursor */}
      {showCursor && (
        <AnimatedCursor
          position={cursorPosition}
          animate={cursorAnimating}
          stopAnimation={stopCursorAnimation}
          showSpotlight={showSpotlight}
          labelPosition={currentPositionConfig.labelPosition}
        />
      )}

      {/* Message Bubbles */}
      {activeBubble === "smarterSupport" && (
        <MessageBubble
          position={cursorPosition}
          text="Instead of just telling them what to do, I’ll guide your customers through every step."
          variant={currentPositionConfig.bubbleVariant}
        />
      )}
      {activeBubble === "knowledgeBank" && (
        <MessageBubble
          position={cursorPosition}
          text="Store critical policies, product details, and procedures, and I'll instantly retrieve and incorporate them into accurate responses."
          variant={currentPositionConfig.bubbleVariant}
        />
      )}
      {activeBubble === "messageReactions" && (
        <MessageBubble
          position={cursorPosition}
          text="Feedback helps me learn what works and what doesn’t, so I can step in confidently—and step aside when I shouldn’t."
          variant={currentPositionConfig.bubbleVariant}
        />
      )}
      {activeBubble === "shorthandReplies" && (
        <MessageBubble
          position={cursorPosition}
          text="Type simple instructions and watch I craft complete, professional responses while maintaining your voice."
          variant={currentPositionConfig.bubbleVariant}
        />
      )}
      {activeBubble === "slackInterface" && (
        <MessageBubble
          position={cursorPosition}
          text="Slack is your support HQ. Ask me how many customers are asking about something—or assign, reply, and close tickets right from the thread."
          variant={currentPositionConfig.bubbleVariant}
        />
      )}
      {activeBubble === "slackNotification" && (
        <MessageBubble
          position={cursorPosition}
          text="If I need a human, I’ll send a heads-up in Slack so your team can jump in fast."
          variant={currentPositionConfig.bubbleVariant}
        />
      )}
      {activeBubble === "responseTimeChart" && (
        <MessageBubble
          position={cursorPosition}
          text="See how Helper dramatically reduces response times even as ticket volume increases, allowing your team to handle more inquiries with less stress."
          variant={currentPositionConfig.bubbleVariant}
        />
      )}
      {activeBubble === "finalToggle" && (
        <MessageBubble
          position={cursorPosition}
          text="Ready to see how AI can transform your customer support?"
          variant={currentPositionConfig.bubbleVariant}
        />
      )}

      {/* Rest of the component remains the same */}
      {/* Intro Section */}
      <section className="min-h-screen flex items-center justify-center">
        <div className="container mx-auto px-4">
          <h1 className="text-6xl font-bold text-center mb-24">Help customers help themselves</h1>

          <div className="max-w-lg mx-auto">
            {/* Customer Message - Right Side */}
            <div className="flex justify-end mb-8">
              <div className="max-w-md w-full">
                <div className="bg-[#412020] rounded-t-2xl rounded-bl-2xl p-6 shadow-lg/40 p-6 h-[80px] relative overflow-hidden">
                  {/* Current question */}
                  <div
                    className="absolute w-full"
                    style={{
                      animation: isAnimating ? "fadeOut 500ms ease-out forwards" : "none",
                    }}
                  >
                    {customerQuestions[currentQuestionIndex]}
                  </div>

                  {/* Next question - only shown during animation */}
                  {isAnimating && (
                    <div
                      className="absolute w-full"
                      style={{
                        animation: "slideIn 500ms ease-out forwards",
                      }}
                    >
                      {customerQuestions[nextQuestionIndex]}
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-2">
                  <div className="text-2xl">👩‍💻</div>
                </div>
              </div>
            </div>

            {/* Helper Message - Left Side */}
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

      {/* New Smarter Support Section */}
      {showFeatures && (
        <section id="smarter-support" className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
              {/* Left Column - Text Content */}
              <div className="sticky top-20">
                <h2 className="text-5xl font-bold mb-8">Helper guides users and resolves issues-- before they become tickets.</h2>
                <Button className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-8 py-6 rounded-md text-lg">
                  Get Started
                </Button>
              </div>

              {/* Right Column - Helping Hand UI */}
              <div>
                <Image src="/images/helping-hand-ui.png" alt="Helping Hand UI" width={600} height={800} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Section - All in one section */}
      {showFeatures && (
        <>
          <section id="features-section" className="py-20">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                {/* Left Column - Feature Images */}
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

                {/* Right Column - Heading and Text */}
                <div className="sticky top-20">
                  <h2 className="text-5xl font-bold mb-8">Powered by your knowledge. 
Refined through feedback. 
Delivered effortlessly.
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
                {/* Left Column - Text Content */}
                <div className="sticky top-20">
                  <h2 className="text-5xl font-bold mb-8">Slack: Your New Support Command Center</h2>

                  <Button className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-8 py-6 rounded-md text-lg">
                    Get Started
                  </Button>
                </div>

                {/* Right Column - UI Elements */}
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
        </>
      )}
    </main>
  )
}
