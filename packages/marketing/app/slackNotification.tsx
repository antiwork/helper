import LogoIconAmber from "./logoIconAmber.svg";

function SlackNotification() {
  return (
    <div className="bg-[#412020] dark:bg-card rounded-xl p-6 shadow-lg h-full flex flex-col">
      <div className="flex items-center mb-4">
        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
        <div className="flex-1 text-center text-sm font-bold text-white dark:text-foreground">#Support</div>
      </div>

      <div className="divide-y divide-[#412020] dark:divide-border">
        <div className="flex items-start py-4">
          <div
            className="w-8 h-8 flex items-center justify-center mr-3 p-1 bg-[#2b0808] dark:bg-muted rounded"
          >
            <LogoIconAmber />
          </div>
          <div className="flex-1">
            <div className="font-bold text-[13px] md:text-[15px] leading-tight text-white dark:text-foreground">
              Helper <span className="text-xs text-gray-400 dark:text-muted-foreground ml-2">10:01 AM</span>
            </div>
            <div className="mt-1 text-[13px] md:text-[15px] leading-snug text-gray-100 dark:text-foreground">
              <span className="text-red-400 dark:text-destructive">@channel</span> I need human assistance with a complex refund request from
              a customer who purchased multiple add-ons but is experiencing technical issues with their integration.
              This is outside my capabilities.
            </div>
            <div className="flex mt-2">
              <button className="bg-[#FEB81D] dark:bg-bright text-black dark:text-bright-foreground text-xs px-3 py-1 rounded font-bold cursor-default">
                View conversation
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-start py-3 md:py-4">
          <div
            className="w-7 h-7 md:w-8 md:h-8 bg-green-600 flex items-center justify-center text-white font-bold mr-3 rounded"
          >
            M
          </div>
          <div className="flex-1">
            <div className="font-bold text-[13px] md:text-[15px] leading-tight text-white dark:text-foreground">
              Mike <span className="text-xs text-gray-400 dark:text-muted-foreground ml-2">10:02 AM</span>
            </div>
            <div className="mt-1 text-[13px] md:text-[15px] leading-snug text-gray-100 dark:text-foreground">I'll take this one</div>
          </div>
        </div>
        <div className="flex items-start py-3 md:py-4">
          <div
            className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center mr-3 p-1 bg-[#2b0808] dark:bg-muted rounded"
          >
            <LogoIconAmber />
          </div>
          <div className="flex-1">
            <div className="font-bold text-[13px] md:text-[15px] leading-tight text-white dark:text-foreground">
              Helper <span className="text-xs text-gray-400 dark:text-muted-foreground ml-2">10:03 AM</span>
            </div>
            <div className="mt-1 text-[13px] md:text-[15px] leading-snug text-gray-100 dark:text-foreground">
              Thanks Mike! I've assigned the conversation to you and added a note with all the context I have so far.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SlackNotification;