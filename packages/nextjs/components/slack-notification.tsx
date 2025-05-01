"use client"

import { Bell, Clock } from "lucide-react"

export default function SlackNotification() {
  return (
    <div className="border border-gray-700 rounded-lg p-4 bg-[#1A1D21]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Bell className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-white font-medium">VIP Ticket Alert</span>
        </div>
        <span className="text-xs text-gray-400">Just now</span>
      </div>

      <div className="bg-[#222529] p-3 rounded-lg mb-3">
        <div className="flex items-center mb-2">
          <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center mr-2">
            <span className="text-xs text-white font-bold">VIP</span>
          </div>
          <span className="font-medium text-white">Enterprise Customer</span>
        </div>
        <p className="text-gray-300 text-sm mb-2">Payment processing issue with latest subscription renewal</p>
        <div className="flex items-center text-xs text-gray-400">
          <Clock className="h-3 w-3 mr-1" />
          <span>Waiting for 4 minutes</span>
        </div>
      </div>

      <div className="flex justify-between">
        <button className="bg-transparent border border-gray-600 text-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-800 transition-colors">
          Snooze
        </button>
        <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors">
          Take Ticket
        </button>
      </div>
    </div>
  )
}
