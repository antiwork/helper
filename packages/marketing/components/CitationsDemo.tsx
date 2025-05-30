"use client";

import React, { useState } from "react";

export default function CitationsDemo() {
  const [tilt, setTilt] = useState<string | null>(null);

  return (
    <div className="relative w-full max-w-3xl md:max-w-4xl mx-auto px-4 h-[300px] md:h-[400px] flex items-center justify-center">
      <div
        className="absolute left-0 top-0 w-[280px] md:w-[440px] h-[200px] md:h-[280px] rounded-t-[22px] rounded-tr-[22px] rounded-br-[22px] rounded-bl-none border border-[#FEB81D80] bg-[#250404] p-4 md:p-8 flex flex-col justify-center"
        style={{ zIndex: 1 }}
      >
        <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
          <div className="h-4 md:h-5 w-4/5 rounded-[8px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
          <div className="h-4 md:h-5 w-3/4 rounded-[8px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
          <div className="h-4 md:h-5 w-2/3 rounded-[8px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
        </div>
        <div className="text-[#FFE6B0] text-base md:text-lg mb-2">Sources:</div>
        <ol className="text-[#FFE6B0] text-sm md:text-base space-y-2 pl-4">
          <li>
            <a
              href="#"
              className="underline cursor-default"
              onClick={(e) => e.preventDefault()}
              onMouseEnter={() => setTilt("refund")}
              onMouseLeave={() => setTilt(null)}
              onMouseDown={() => setTilt("refund")}
              onMouseUp={() => setTilt(null)}
            >
              Refund policy
            </a>
          </li>
          <li>
            <a
              href="#"
              className="underline cursor-default"
              onClick={(e) => e.preventDefault()}
              onMouseEnter={() => setTilt("account")}
              onMouseLeave={() => setTilt(null)}
              onMouseDown={() => setTilt("account")}
              onMouseUp={() => setTilt(null)}
            >
              Account setup
            </a>
          </li>
        </ol>
      </div>
      <div
        className={`absolute z-10 transition-transform duration-200
          right-[20px] top-[50px] w-[100px] h-[130px]
          md:right-[120px] md:top-[80px] md:w-[130px] md:h-[170px]
          lg:right-[120px] lg:top-[100px] lg:w-[150px] lg:h-[200px]
          xl:right-[180px] xl:top-[110px] xl:w-[170px] xl:h-[230px]
          ${tilt === "refund" ? "-rotate-12" : "rotate-[-8deg]"}
        `}
        onMouseEnter={() => setTilt("refund")}
        onMouseLeave={() => setTilt(null)}
      >
        <div className="w-full h-full rounded-[18px] border border-[#459EFD] bg-[#250404] p-3 md:p-5 flex flex-col">
          <div className="text-[#FFE6B0] text-base md:text-lg font-semibold mb-2 md:mb-3">Refund policy</div>
          <div className="space-y-1.5 md:space-y-2">
            <div className="h-2 md:h-3 w-5/6 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
            <div className="h-2 md:h-3 w-4/5 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
            <div className="h-2 md:h-3 w-3/4 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
            <div className="h-2 md:h-3 w-2/3 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
            <div className="h-2 md:h-3 w-1/2 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
          </div>
        </div>
      </div>
      <div
        className={`absolute z-10 transition-transform duration-200
          right-[-40px] top-[20px] w-[100px] h-[130px]
          md:right-[60px] md:top-[50px] md:w-[130px] md:h-[170px]
          lg:right-[5px] lg:top-[80px] lg:w-[150px] lg:h-[200px]
          xl:right-[30px] xl:top-[60px] xl:w-[170px] xl:h-[230px]
          ${tilt === "account" ? "rotate-12" : "rotate-[8deg]"}
        `}
        onMouseEnter={() => setTilt("account")}
        onMouseLeave={() => setTilt(null)}
      >
        <div className="w-full h-full rounded-[18px] border border-[#FF90E8] bg-[#250404] p-3 md:p-5 flex flex-col">
          <div className="text-[#FFE6B0] text-base md:text-lg font-semibold mb-2 md:mb-3">Account setup</div>
          <div className="space-y-1.5 md:space-y-2">
            <div className="h-2 md:h-3 w-5/6 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
            <div className="h-2 md:h-3 w-4/5 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
            <div className="h-2 md:h-3 w-3/4 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
            <div className="h-2 md:h-3 w-2/3 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
            <div className="h-2 md:h-3 w-1/2 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
