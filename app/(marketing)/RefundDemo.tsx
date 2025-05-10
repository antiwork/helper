import { MousePointerClick, MousePointer } from "lucide-react";
import AnimatedTyping from "@/components/animated-typing";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function RefundDemo() {
  const [messageDone, setMessageDone] = useState(false);
  const [pointerClicked, setPointerClicked] = useState(false);

  // Automatically trigger pointer click after typing
  useEffect(() => {
    if (messageDone && !pointerClicked) {
      const timer = setTimeout(() => setPointerClicked(true), 700);
      return () => clearTimeout(timer);
    }
  }, [messageDone, pointerClicked]);

  return (
    <div className="relative min-h-[800px] flex flex-col items-center justify-center py-12">
      <div className="absolute top-8 left-[60%] -translate-x-1/2 flex flex-col items-start z-20">
        <div className="border border-[#FEB81D80] rounded-t-xl rounded-bl-xl rounded-br-none px-5 py-3 w-[440px] text-lg font-medium text-[#FFE6B0] bg-[#250404]">
          {!messageDone ? (
            <AnimatedTyping text="How do I request a refund on my recent order?" speed={28} onComplete={() => setMessageDone(true)} />
          ) : (
            <span>How do I request a refund on my recent order?</span>
          )}
        </div>
      </div>
      <div className="relative w-full max-w-5xl h-[520px]">
        <div className="rounded-2xl overflow-hidden bg-[#6348474D] h-full">
          <div className="flex items-center h-12 px-4 bg-[#250404]">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block" />
            </span>
          </div>
          <div className="flex h-[calc(100%-3rem)]">
            <aside className="flex flex-col gap-2 py-12 pl-8 pr-4 w-48 min-w-[140px] bg-transparent">
              <span className="text-[#FFE6B0] font-semibold px-2 py-1 rounded transition-colors hover:bg-[#2B0808]/60">Dashboard</span>
              <span className="text-[#FFE6B0] font-semibold px-2 py-1 rounded transition-colors border-l-4 border-[#FEB81D] bg-[#3B1B1B]">Orders</span>
              <span className="text-[#FFE6B0] font-semibold px-2 py-1 rounded transition-colors hover:bg-[#2B0808]/60">Profile</span>
              <span className="text-[#FFE6B0] font-semibold px-2 py-1 rounded transition-colors hover:bg-[#2B0808]/60">Wishlist</span>
              <span className="text-[#FFE6B0] font-semibold px-2 py-1 rounded transition-colors hover:bg-[#2B0808]/60">Settings</span>
            </aside>
            <main className="flex-1 flex flex-col gap-8 py-12 pr-8 relative">
              <div className="relative">
                <div className="text-xl font-bold mb-4 text-[#FFE6B0]">Your orders</div>
                <div className="flex flex-col gap-4">
                  <motion.div
                    className={`rounded-xl px-6 py-4 flex flex-col border ${pointerClicked ? 'border-[#FEB81D]' : 'border-[#FEB81D80]'} bg-[#250404] relative`}
                    animate={pointerClicked ? { scale: [1, 0.97, 1] } : {}}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="font-semibold text-[#FFE6B0]">Order #rt45840</div>
                    <div className="text-[#FEB81D] text-lg">$44.32</div>
                    {messageDone && (
                      <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="absolute -top-2 left-1/2 -translate-x-1/2 flex flex-col items-start z-20"
                      >
                        <motion.span
                          animate={pointerClicked ? { x: 30, y: 30, scale: [1, 0.9, 1] } : {}}
                          transition={{ duration: 0.5, type: 'spring' }}
                          className="flex flex-col items-start"
                        >
                          <span className="bg-[#FEB81D] text-black text-sm font-medium rounded-full px-4 py-1 mb-1 ml-3" style={{borderRadius:'9999px'}}>
                            Helper
                          </span>
                          <span className="w-7 h-7 rounded-full border border-[#A3A3A3] bg-black flex items-center justify-center p-1">
                            <MousePointer color="#fff" fill="#fff" size={16} />
                          </span>
                        </motion.span>
                      </motion.div>
                    )}
                  </motion.div>
                  <div className="rounded-xl px-6 py-4 flex flex-col border border-transparent bg-[#250404]">
                    <div className="font-semibold text-[#FFE6B0]">Order #74cd730</div>
                    <div className="text-[#FEB81D] text-lg">$28.43</div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="absolute" style={{top:'68%',right:'-60px',zIndex:30}}>
          <div className="bg-[#250404] border border-[#FEB81D80] rounded-xl px-8 py-7 w-[440px]">
            <div className="flex items-center gap-2 mb-4">
              <MousePointerClick size={22} color="#FEB81D" />
              <span className="font-semibold text-base text-[#FFE6B0] whitespace-nowrap">Requesting a refund on your recent order</span>
            </div>
            <div className="h-2 w-full bg-[#FEB81D]/20 rounded mb-6 overflow-hidden"><div className="h-2 bg-[#FEB81D] w-1/6 rounded" /></div>
            <div className="flex flex-col gap-5 mt-2">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-[#C2D44B] flex items-center justify-center"><span className="w-2 h-2 rounded-full bg-[#250404]" /></span>
                <span className="text-[#FFE6B0]">Navigate to order history</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 flex items-center justify-center">
                  {pointerClicked ? (
                    <svg
                      className="w-5 h-5 animate-spin text-[#FFD34E]"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle className="opacity-20" cx="10" cy="10" r="9" stroke="#FFD34E" strokeWidth="3" />
                      <path d="M10 2a8 8 0 1 1-8 8" stroke="#FFD34E" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-[#FEB81D] flex items-center justify-center" />
                  )}
                </span>
                <span className="text-[#FFE6B0]">Select which order to refund</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full border-2 border-[#FEB81D] flex items-center justify-center" />
                <span className="text-[#FFE6B0]">Add reason for refund request</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full border-2 border-[#FEB81D] flex items-center justify-center" />
                <span className="text-[#FFE6B0]">Submit refund request</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}