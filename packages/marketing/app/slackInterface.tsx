"use client";

import LogoIconAmber from "./logoIconAmber.svg";

function SlackInterface() {
  return (
    <div className="bg-[#412020] rounded-xl p-6 shadow-lg h-full flex flex-col">
      <div className="flex items-center mb-4">
        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
        <div className="flex-1 text-center text-sm font-bold text-white">#gumroad-support</div>
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
            <div className="font-bold text-[13px] md:text-[15px] leading-tight">
              Gumroad Helper{" "}
              <span className="bg-[#FEB81D] text-black text-xs px-1.5 py-0.5 rounded font-bold ml-1">APP</span>{" "}
              <span className="text-xs text-gray-400 ml-2">12:00 PM</span>
            </div>
            <div className="mt-1 text-[13px] md:text-[15px] leading-snug text-gray-100">
              <div className="font-semibold mb-2">Daily Summary for Gumroad:</div>
              <div className="space-y-1">
                <div>
                  • <span className="font-medium">Open tickets:</span> 67
                </div>
                <div>
                  • <span className="font-medium">Tickets answered:</span> 137
                </div>
                <div>
                  • <span className="font-medium">Open tickets over $0:</span> 23
                </div>
                <div>
                  • <span className="font-medium">Tickets answered over $0:</span> 55
                </div>
                <div>
                  • <span className="font-medium">Average reply time:</span> 28h 8m
                </div>
                <div>
                  • <span className="font-medium">VIP average reply time:</span> 17h 20m
                </div>
                <div>
                  • <span className="font-medium">Average time existing open tickets have been open:</span> 42h 43m
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-start py-4">
          <div
            className="w-7 h-7 md:w-8 md:h-8 bg-blue-600 flex items-center justify-center text-white font-bold mr-3"
            style={{ borderRadius: 4 }}
          >
            M
          </div>
          <div className="flex-1">
            <div className="font-bold text-[13px] md:text-[15px] leading-tight">
              Mike <span className="text-xs text-gray-400 ml-2">12:05 PM</span>
            </div>
            <div className="mt-1 text-[13px] md:text-[15px] leading-snug text-gray-100">
              <span className="font-semibold text-[#FEB81D]">@Helper</span> How many tickets did I answer last week?
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
            <div className="font-bold text-[13px] md:text-[15px] leading-tight">
              Helper <span className="text-xs text-gray-400 ml-2">12:05 PM</span>
            </div>
            <div className="mt-1 text-[13px] md:text-[15px] leading-snug text-gray-100">
              <div className="mb-2">
                {" "}
                <span className="font-semibold text-[#FEB81D]">@mike</span> You answered{" "}
                <span className="font-semibold">78 tickets</span> last week! 🎉
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SlackInterface;
