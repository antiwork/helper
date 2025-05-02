"use client";

import { useEffect, useState } from "react";

export function SlackNotification() {
  return (
    <div className="bg-[#412020] rounded-xl p-6 shadow-lg">
      <div className="flex items-center mb-4">
        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
        <div className="flex-1 text-center text-sm text-gray-300">Slack - Helper</div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold mr-3">
            H
          </div>
          <div>
            <div className="font-bold">Helper</div>
            <div className="bg-gray-700 rounded p-3 mt-1">
              <p className="text-sm">
                <span className="text-red-400">@channel</span> I need human assistance with a complex refund request
                from a customer who purchased multiple add-ons but is experiencing technical issues with their
                integration. This is outside my capabilities.
              </p>
            </div>
            <div className="flex mt-2">
              <button className="bg-blue-600 text-white text-xs px-3 py-1 rounded">View conversation</button>
            </div>
          </div>
        </div>

        <div className="flex items-start">
          <div className="w-8 h-8 rounded bg-green-600 flex items-center justify-center text-white font-bold mr-3">
            M
          </div>
          <div>
            <div className="font-bold">Mike</div>
            <div className="bg-gray-700 rounded p-3 mt-1">
              <p className="text-sm">I'll take this one</p>
            </div>
          </div>
        </div>

        <div className="flex items-start">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold mr-3">
            H
          </div>
          <div>
            <div className="font-bold">Helper</div>
            <div className="bg-gray-700 rounded p-3 mt-1">
              <p className="text-sm">
                Thanks Mike! I've assigned the conversation to you and added a note with all the context I have so far.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SlackNotification;
