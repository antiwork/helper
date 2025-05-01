"use client"

import { MessageSquare, User, Bot } from "lucide-react"

export default function SlackInterface() {
  return (
    <div className="border border-gray-700 rounded-lg p-4 bg-[#1A1D21]">
      <div className="flex items-center mb-4">
        <MessageSquare className="h-5 w-5 text-gray-400 mr-2" />
        <span className="text-gray-300 font-medium">#support</span>
      </div>

      <div className="space-y-4">
        <div className="flex">
          <div className="flex-shrink-0 mr-2">
            <div className="h-8 w-8 rounded bg-purple-700 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center">
              <span className="font-medium text-white">Sarah</span>
              <span className="text-gray-400 text-xs ml-2">10:42 AM</span>
            </div>
            <p className="text-gray-300">How many tickets do we have about our refund policy?</p>
          </div>
        </div>

        <div className="flex">
          <div className="flex-shrink-0 mr-2">
            <div className="h-8 w-8 rounded bg-yellow-500 flex items-center justify-center">
              <Bot className="h-4 w-4 text-black" />
            </div>
          </div>
          <div>
            <div className="flex items-center">
              <span className="font-medium text-white">Helper</span>
              <span className="text-gray-400 text-xs ml-2">10:42 AM</span>
            </div>
            <p className="text-gray-300">
              There are currently 24 open tickets related to refund policy questions. 18 are about the 30-day guarantee,
              and 6 are about pro-rated refunds.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
