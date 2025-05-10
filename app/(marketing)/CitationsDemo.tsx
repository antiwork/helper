import React, { useState } from "react";

export default function CitationsDemo() {
  const [tilt, setTilt] = useState<string | null>(null);

  return (
    <div className="relative flex items-center justify-center w-[600px] h-[400px]">
      <div className="absolute left-0 top-0 w-[440px] h-[280px] rounded-t-[22px] rounded-tr-[22px] rounded-br-[22px] rounded-bl-none border border-[#FEB81D80] bg-[#250404] p-8 flex flex-col justify-center" style={{zIndex:1}}>
        <div className="space-y-3 mb-6">
          <div className="h-5 w-4/5 rounded-[8px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
          <div className="h-5 w-3/4 rounded-[8px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
          <div className="h-5 w-2/3 rounded-[8px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
        </div>
        <div className="text-[#FFE6B0] text-lg mb-2">Sources:</div>
        <ol className="text-[#FFE6B0] text-base space-y-2 pl-4">
          <li>
            <a
              href="#"
              className="underline"
              onClick={e => e.preventDefault()}
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
              className="underline"
              onClick={e => e.preventDefault()}
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
        className={`absolute left-[320px] top-[110px] z-10 transition-transform duration-200 ${tilt === "refund" ? "-rotate-12" : "rotate-[-8deg]"}`}
        onMouseEnter={() => setTilt("refund")}
        onMouseLeave={() => setTilt(null)}
        style={{}}
      >
        <div className="w-[170px] h-[230px] rounded-[18px] border border-[#459EFD] bg-[#250404] p-5 flex flex-col">
          <div className="text-[#FFE6B0] text-lg font-semibold mb-3">Refund policy</div>
          <div className="space-y-2">
            <div className="h-3 w-5/6 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
            <div className="h-3 w-4/5 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
            <div className="h-3 w-3/4 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
            <div className="h-3 w-2/3 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
            <div className="h-3 w-1/2 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
          </div>
        </div>
      </div>
      <div
        className={`absolute left-[470px] top-[60px] z-10 transition-transform duration-200 ${tilt === "account" ? "rotate-12" : "rotate-[8deg]"}`}
        onMouseEnter={() => setTilt("account")}
        onMouseLeave={() => setTilt(null)}
        style={{}}
      >
        <div className="w-[170px] h-[230px] rounded-[18px] border border-[#FF90E8] bg-[#250404] p-5 flex flex-col">
          <div className="text-[#FFE6B0] text-lg font-semibold mb-3">Account setup</div>
          <div className="space-y-2">
            <div className="h-3 w-5/6 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
            <div className="h-3 w-4/5 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
            <div className="h-3 w-3/4 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
            <div className="h-3 w-2/3 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
            <div className="h-3 w-1/2 rounded-[6px] bg-[#3B1B1B] opacity-60 blur-[1px]" />
          </div>
        </div>
      </div>
    </div>
  );
} 