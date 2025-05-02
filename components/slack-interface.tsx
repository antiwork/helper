"use client";

import { useEffect, useState } from "react";

export function SlackInterface() {
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
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold mr-3">H</div>
          <div>
            <div className="font-bold">Helper</div>
            <div className="bg-gray-700 rounded p-3 mt-1">
              <p className="text-sm">
                @sarah There's a new support request from customer@example.com about their subscription renewal. Would you
                like me to draft a response?
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start">
          <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center text-white font-bold mr-3">
            S
          </div>
          <div>
            <div className="font-bold">Sarah</div>
            <div className="bg-gray-700 rounded p-3 mt-1">
              <p className="text-sm">Yes please, and include their current plan details</p>
            </div>
          </div>
        </div>

        <div className="flex items-start">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold mr-3">H</div>
          <div>
            <div className="font-bold">Helper</div>
            <div className="bg-gray-700 rounded p-3 mt-1">
              <p className="text-sm">
                Here's a draft response:
                <br />
                <br />
                "Hi there,
                <br />
                <br />
                Thanks for reaching out about your subscription renewal. I can see you're currently on our Pro plan
                ($49/month) which is set to renew on May 15th.
                <br />
                <br />
                Would you like me to help you update your billing information or make changes to your plan before the
                renewal date?
                <br />
                <br />
                Best,
                <br />
                Sarah"
              </p>
            </div>
            <div className="flex mt-2 space-x-2">
              <button className="bg-green-600 text-white text-xs px-3 py-1 rounded">Send as is</button>
              <button className="bg-blue-600 text-white text-xs px-3 py-1 rounded">Edit & send</button>
              <button className="bg-gray-600 text-white text-xs px-3 py-1 rounded">Discard</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SlackInterface;
