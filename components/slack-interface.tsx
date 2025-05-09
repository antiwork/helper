"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import LogoIconAmber from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/icons/logoIconAmber.svg";

export function SlackInterface() {
  return (
    <div className="bg-[#412020] rounded-xl p-6 shadow-lg">
      <div className="flex items-center mb-4">
        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
        <div className="flex-1 text-center text-sm font-bold text-white">#VIPs</div>
      </div>

      <div className="divide-y divide-[#412020]">
        <div className="flex items-start py-4">
          <div
            className="w-8 h-8 flex items-center justify-center mr-3 p-1"
            style={{ borderRadius: 4, background: "#2b0808" }}
          >
            <LogoIconAmber />
          </div>
          <div className="flex-1">
            <div className="font-bold text-[15px] leading-tight">
              Helper <span className="text-xs text-gray-400 ml-2">9:41 AM</span>
            </div>
            <div className="mt-1 text-[15px] leading-snug text-gray-100">
              @sarah There's a new support request from customer@example.com about their subscription renewal. Would you
              like me to draft a response?
            </div>
          </div>
        </div>
        <div className="flex items-start py-4">
          <div
            className="w-8 h-8 bg-purple-600 flex items-center justify-center text-white font-bold mr-3"
            style={{ borderRadius: 4 }}
          >
            S
          </div>
          <div className="flex-1">
            <div className="font-bold text-[15px] leading-tight">
              Sarah <span className="text-xs text-gray-400 ml-2">9:42 AM</span>
            </div>
            <div className="mt-1 text-[15px] leading-snug text-gray-100">
              Yes please, and include their current plan details
            </div>
          </div>
        </div>
        <div className="flex items-start py-4">
          <div
            className="w-8 h-8 flex items-center justify-center mr-3 p-1"
            style={{ borderRadius: 4, background: "#2b0808" }}
          >
            <LogoIconAmber />
          </div>
          <div className="flex-1">
            <div className="font-bold text-[15px] leading-tight">
              Helper <span className="text-xs text-gray-400 ml-2">9:43 AM</span>
            </div>
            <div className="mt-1 text-[15px] leading-snug text-gray-100">
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
            </div>
            <div className="flex mt-2 space-x-2">
              <button className="bg-[#FEB81D] text-black text-xs px-3 py-1 rounded font-bold">Send</button>
              <button className="bg-[#2B0808] text-white text-xs px-3 py-1 rounded font-bold">edit</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SlackInterface;
