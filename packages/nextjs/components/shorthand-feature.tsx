"use client"

import { useState } from "react"
import { ThumbsUp, ThumbsDown, ArrowRight } from "lucide-react"

export default function ShorthandFeature() {
  const [feedbackGiven, setFeedbackGiven] = useState<"up" | "down" | null>(null)

  const handleFeedback = (type: "up" | "down") => {
    setFeedbackGiven(type)
  }

  const shorthandExample = `send our refund policy`

  const completeResponse = `Thank you for reaching out about our refund policy. We offer a 30-day satisfaction guarantee on all purchases. If you're not completely satisfied with your order, you can request a full refund within 30 days of delivery by contacting our support team with your order number.

Is there anything specific about our refund process you'd like me to clarify further?

Best regards,
Helper`

  return (
    <div className="p-6 rounded-lg bg-[#2B0808] border border-burgundy-700">
      <h3 className="text-lg font-medium text-white mb-6">Shorthand Commands</h3>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-[#3D1818] p-4 rounded-lg border border-burgundy-700">
          <div className="text-sm text-amber-400 mb-2">Your shorthand:</div>
          <div className="font-mono text-sm text-white bg-[#200606] p-3 rounded-md border border-burgundy-800">
            {shorthandExample}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <ArrowRight className="h-6 w-6 text-amber-400" />
        </div>

        <div className="bg-[#3D1818] p-4 rounded-lg border border-burgundy-700">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm text-amber-400">Complete response:</div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleFeedback("up")}
                className={`p-1.5 rounded-full transition-all ${
                  feedbackGiven === "up"
                    ? "bg-green-900 text-green-400"
                    : "bg-[#200606] hover:bg-[#2B0808] text-amber-200"
                }`}
                aria-label="Thumbs up"
              >
                <ThumbsUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleFeedback("down")}
                className={`p-1.5 rounded-full transition-all ${
                  feedbackGiven === "down"
                    ? "bg-red-900 text-red-400"
                    : "bg-[#200606] hover:bg-[#2B0808] text-amber-200"
                }`}
                aria-label="Thumbs down"
              >
                <ThumbsDown className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="bg-[#200606] p-3 rounded-md border border-burgundy-800 text-sm text-white max-h-32 overflow-y-auto">
            {completeResponse}
          </div>
        </div>
      </div>
    </div>
  )
}
