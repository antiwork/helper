"use client"

import { GraduationCap, ThumbsUp, BracesIcon as BracesAsterisk } from "lucide-react"

export default function FeatureCards() {
  return (
    <div className="space-y-6">
      {/* Knowledge Bank Card */}
      <div
        id="knowledgeBank"
        className="bg-[#1D0A0A] p-6 rounded-xl border border-burgundy-800 transform rotate-[-1deg] hover:rotate-0 transition-transform duration-300"
      >
        <div className="flex items-start">
          <div className="bg-blue-500 p-3 rounded-lg mr-4">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-amber-50 mb-2">KNOWLEDGE BANK</h3>
            <p className="text-amber-200/80">What's your refund policy?</p>
          </div>
        </div>
      </div>

      {/* Message Reactions Card */}
      <div
        id="messageReactions"
        className="bg-[#1D0A0A] p-6 rounded-xl border border-burgundy-800 transform rotate-[1deg] hover:rotate-0 transition-transform duration-300"
      >
        <div className="flex items-start">
          <div className="bg-green-500 p-3 rounded-lg mr-4">
            <ThumbsUp className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-amber-50 mb-2">MESSAGE REACTIONS</h3>
            <p className="text-amber-200/80">Great job, Helper!</p>
          </div>
        </div>
      </div>

      {/* Shorthand Replies Card */}
      <div
        id="shorthandReplies"
        className="bg-[#1D0A0A] p-6 rounded-xl border border-burgundy-800 transform rotate-[-1deg] hover:rotate-0 transition-transform duration-300"
      >
        <div className="flex items-start">
          <div className="bg-purple-500 p-3 rounded-lg mr-4">
            <BracesAsterisk className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-amber-50 mb-2">SHORTHAND REPLIES</h3>
            <p className="text-amber-200/80">Send the customer our refund policy.</p>
          </div>
        </div>
      </div>

      {/* Tool Usage Card */}
      <div
        id="toolUsage"
        className="bg-[#1D0A0A] p-6 rounded-xl border border-burgundy-800 transform rotate-[1deg] hover:rotate-0 transition-transform duration-300"
      >
        <div className="flex items-start">
          <div className="bg-amber-500 p-3 rounded-lg mr-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-amber-50 mb-2">TOOL USAGE</h3>
            <p className="text-amber-200/80">Process refund for order #38291</p>
          </div>
        </div>
      </div>
    </div>
  )
}
