"use client";

import LogoIconAmber from "./logoIconAmber.svg";

function SlackNotification() {
  return (
    <div className="bg-[#412020] rounded-xl p-6 shadow-lg h-full flex flex-col">
      <div className="flex items-center mb-4">
        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
        <div className="flex-1 text-center text-sm font-bold text-white">#Support</div>
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
              Helper <span className="text-xs text-gray-400 ml-2">10:01 AM</span>
            </div>
            <div className="mt-1 text-[13px] md:text-[15px] leading-snug text-gray-100">
              <span className="text-red-400">@channel</span> I need human assistance with a complex refund request from
              a customer who purchased multiple add-ons but is experiencing technical issues with their integration.
              This is outside my capabilities.
            </div>
            <div className="flex mt-2">
              <button className="bg-[#FEB81D] text-black text-xs px-3 py-1 rounded font-bold cursor-default">
                View conversation
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-start py-3 md:py-4">
          <div
            className="w-7 h-7 md:w-8 md:h-8 bg-green-600 flex items-center justify-center text-white font-bold mr-3"
            style={{ borderRadius: 4 }}
          >
            M
          </div>
          <div className="flex-1">
            <div className="font-bold text-[13px] md:text-[15px] leading-tight">
              Mike <span className="text-xs text-gray-400 ml-2">10:02 AM</span>
            </div>
            <div className="mt-1 text-[13px] md:text-[15px] leading-snug text-gray-100">I'll take this one</div>
          </div>
        </div>
        <div className="flex items-start py-3 md:py-4">
          <div
            className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center mr-3 p-1"
            style={{ borderRadius: 4, background: "#2b0808" }}
          >
            <LogoIconAmber />
          </div>
          <div className="flex-1">
            <div className="font-bold text-[13px] md:text-[15px] leading-tight">
              Helper <span className="text-xs text-gray-400 ml-2">10:03 AM</span>
            </div>
            <div className="mt-1 text-[13px] md:text-[15px] leading-snug text-gray-100">
              Thanks Mike! I've assigned the conversation to you and added a note with all the context I have so far.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SlackNotification;
