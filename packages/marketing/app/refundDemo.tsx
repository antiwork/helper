"use client";

import { MousePointer, MousePointerClick } from "lucide-react";
import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import AnimatedTyping from "./animatedTyping";

export default function RefundDemo() {
  const [messageDone, setMessageDone] = useState(false);
  const [pointerClicked, setPointerClicked] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  useEffect(() => {
    if (isInView && messageDone && !pointerClicked) {
      const timer = setTimeout(() => setPointerClicked(true), 700);
      return () => clearTimeout(timer);
    }
  }, [messageDone, pointerClicked, isInView]);

  return (
    <div
      ref={ref}
      className="relative min-h-[600px] md:min-h-[800px] flex flex-col items-center justify-center py-16 md:py-24 pb-40 md:pb-64"
    >
      <div className="absolute top-8 right-0 flex flex-col items-start z-20">
        <div className="border border-[#FEB81D80] rounded-t-xl rounded-bl-xl rounded-br-none px-4 md:px-5 py-3 w-[320px] md:w-[440px] text-base md:text-lg font-medium text-[#FFE6B0] bg-[#250404]">
          {!messageDone && isInView ? (
            <AnimatedTyping
              text="How do I request a refund on my recent order?"
              speed={28}
              onComplete={() => setMessageDone(true)}
            />
          ) : (
            <span>How do I request a refund on my recent order?</span>
          )}
        </div>
      </div>
      <div className="relative w-full max-w-5xl h-[400px] md:h-[520px] mt-16 md:mt-0">
        <div className="rounded-2xl overflow-hidden bg-[#6348474D] h-full">
          <div className="flex items-center h-12 px-4 bg-[#250404]">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block" />
            </span>
          </div>
          <div className="flex h-[calc(100%-3rem)]">
            <aside className="flex flex-col gap-2 py-12 pl-4 md:pl-8 pr-2 md:pr-4 w-32 md:w-48 min-w-[100px] md:min-w-[140px] bg-transparent">
              <span className="text-[#FFE6B0] text-sm md:text-base font-semibold px-2 py-1 rounded">Dashboard</span>
              <span className="text-[#FFE6B0] text-sm md:text-base font-semibold px-2 py-1 rounded transition-colors border-l-4 border-[#FEB81D] bg-[#3B1B1B]">
                Orders
              </span>
              <span className="text-[#FFE6B0] text-sm md:text-base font-semibold px-2 py-1 rounded">Profile</span>
              <span className="text-[#FFE6B0] text-sm md:text-base font-semibold px-2 py-1 rounded">Wishlist</span>
              <span className="text-[#FFE6B0] text-sm md:text-base font-semibold px-2 py-1 rounded">Settings</span>
            </aside>
            <main className="flex-1 flex flex-col gap-8 py-12 pr-4 md:pr-8 relative">
              <div className="relative">
                <div className="text-lg md:text-xl font-bold mb-4 text-[#FFE6B0]">Your orders</div>
                <div className="flex flex-col gap-4">
                  <motion.div
                    className={`rounded-xl px-4 md:px-6 py-4 flex flex-col border ${pointerClicked ? "border-[#FEB81D]" : "border-[#FEB81D80]"} bg-[#250404] relative`}
                    animate={pointerClicked ? { scale: [1, 0.97, 1] } : {}}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="font-semibold text-[#FFE6B0] text-sm md:text-base">Order #rt45840</div>
                    <div className="text-[#FEB81D] text-base md:text-lg">$44.32</div>
                    {messageDone && (
                      <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="absolute -top-2 left-1/2 -translate-x-1/2 flex flex-col items-start z-20"
                      >
                        <motion.span
                          animate={pointerClicked ? { x: 30, y: 30, scale: [1, 0.9, 1] } : {}}
                          transition={{ duration: 0.5 }}
                          className="flex flex-col items-start"
                        >
                          <span
                            className="bg-[#FEB81D] text-black text-xs md:text-sm font-medium rounded-full px-3 md:px-4 py-1 mb-1 ml-3"
                            style={{ borderRadius: "9999px" }}
                          >
                            Helper
                          </span>
                          <span className="w-6 h-6 md:w-7 md:h-7 rounded-full border border-[#A3A3A3] bg-black flex items-center justify-center p-1">
                            <MousePointer color="#fff" fill="#fff" size={14} className="md:w-4 md:h-4" />
                          </span>
                        </motion.span>
                      </motion.div>
                    )}
                  </motion.div>
                  <div className="rounded-xl px-4 md:px-6 py-4 flex flex-col border border-transparent bg-[#250404]">
                    <div className="font-semibold text-[#FFE6B0] text-sm md:text-base">Order #74cd730</div>
                    <div className="text-[#FEB81D] text-base md:text-lg">$28.43</div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="absolute" style={{ top: "78%", right: "-10px", zIndex: 30 }}>
          <div className="bg-[#250404] border border-[#FEB81D80] rounded-xl px-4 md:px-8 py-5 md:py-7 w-[320px] md:w-[440px] mt-8 md:mt-0">
            <div className="flex items-center gap-2 mb-4">
              <MousePointerClick size={18} className="md:w-[22px] md:h-[22px]" color="#FEB81D" />
              <span className="font-semibold text-sm md:text-base text-[#FFE6B0]">
                Requesting a refund on your most recent order
              </span>
            </div>
            <div className="h-2 w-full bg-[#FEB81D]/20 rounded mb-6 overflow-hidden">
              <div className="h-2 bg-[#FEB81D] w-1/6 rounded" />
            </div>
            <div className="flex flex-col gap-4 md:gap-5 mt-2">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-[#C2D44B] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#250404]" />
                </span>
                <span className="text-[#FFE6B0] text-sm md:text-base">Navigate to order history</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 md:w-4 md:h-4 flex items-center justify-center">
                  {pointerClicked ? (
                    <svg
                      className="w-4 h-4 md:w-5 md:h-5 animate-spin text-[#FFD34E]"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle className="opacity-20" cx="10" cy="10" r="9" stroke="#FFD34E" strokeWidth="3" />
                      <path d="M10 2a8 8 0 1 1-8 8" stroke="#FFD34E" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <span className="w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-[#FEB81D] flex items-center justify-center" />
                  )}
                </span>
                <span className="text-[#FFE6B0] text-sm md:text-base">Select which order to refund</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-[#FEB81D] flex items-center justify-center" />
                <span className="text-[#FFE6B0] text-sm md:text-base">Add reason for refund request</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-[#FEB81D] flex items-center justify-center" />
                <span className="text-[#FFE6B0] text-sm md:text-base">Submit refund request</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
