"use client";

import { Calendar, HandCoins, ListOrdered, PlayCircle, Receipt } from "lucide-react";
import React, { useState } from "react";

const tools = [
  {
    text: "Send me a list of my last 5 orders over $100.",
    color: "#FF90E8",
    border: "border-[#FF90E8]",
    completed: {
      icon: <ListOrdered color="#FF90E8" className="w-7 h-7" />,
      text: "Recent orders over $100: #3214, #1322...",
    },
  },
  {
    text: "What's my payout balance?",
    color: "#C2D44B",
    border: "border-[#C2D44B]",
    completed: { icon: <HandCoins color="#C2D44B" className="w-7 h-7" />, text: "Payout balance: $1,234.56" },
  },
  {
    text: "Resend my last receipt",
    color: "#FEB81D",
    border: "border-[#FEB81D]",
    completed: { icon: <Receipt color="#FEB81D" className="w-7 h-7" />, text: "Done! Check your email." },
  },
  {
    text: "When is my next payout?",
    color: "#459EFD",
    border: "border-[#459EFD]",
    completed: { icon: <Calendar color="#459EFD" className="w-7 h-7" />, text: "Your next payout is friday" },
  },
];

export default function ToolsDemo() {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="w-full min-h-[320px] md:min-h-[420px] flex flex-col items-center justify-center">
      <div className="flex flex-col gap-8 md:gap-14 w-full max-w-3xl mx-auto">
        {tools.map((tool, i) => (
          <div key={tool.text} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <div
              className={`flex items-center gap-3 md:gap-4 border ${tool.border} rounded-full py-2 px-3 transition-transform duration-200 bg-transparent max-w-full overflow-hidden`}
              style={{
                transform: hovered === i ? `rotate(${i % 2 === 0 ? "-3deg" : "3deg"})` : undefined,
                boxShadow: hovered === i ? `0 2px 16px 0 ${tool.color}22` : undefined,
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {hovered === i ? (
                <span className="flex items-center justify-center w-5 h-5 md:w-7 md:h-7">{tool.completed.icon}</span>
              ) : (
                <span className="flex items-center justify-center w-5 h-5 md:w-7 md:h-7">
                  <PlayCircle className="w-5 h-5 md:w-7 md:h-7" color={tool.color} fill="none" />
                </span>
              )}
              <span className="italic text-base md:text-xl text-[#FFE6B0]">
                {hovered === i ? tool.completed.text : tool.text}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
