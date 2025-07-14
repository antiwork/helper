import LogoIconAmber from "./logoIconAmber.svg";

function SlackInterface() {
  return (
    <div className="bg-[#412020] dark:bg-card rounded-xl p-6 shadow-lg h-full flex flex-col">
      <div className="flex items-center mb-4">
        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
        <div className="flex-1 text-center text-sm font-bold text-white dark:text-foreground">#VIPs</div>
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
              Helper <span className="text-xs text-gray-400 dark:text-muted-foreground ml-2">9:41 AM</span>
            </div>
            <div className="mt-1 text-[13px] md:text-[15px] leading-snug text-gray-100 dark:text-foreground">
              @sarah There's a new support request from customer@example.com about their subscription renewal. Would you
              like me to draft a response?
            </div>
          </div>
        </div>
        <div className="flex items-start py-3 md:py-4">
          <div
            className="w-7 h-7 md:w-8 md:h-8 bg-purple-600 flex items-center justify-center text-white font-bold mr-3 rounded"
          >
            S
          </div>
          <div className="flex-1">
            <div className="font-bold text-[13px] md:text-[15px] leading-tight text-white dark:text-foreground">
              Sarah <span className="text-xs text-gray-400 dark:text-muted-foreground ml-2">9:42 AM</span>
            </div>
            <div className="mt-1 text-[13px] md:text-[15px] leading-snug text-gray-100 dark:text-foreground">
              Yes please, and include their current plan details
            </div>
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
              Helper <span className="text-xs text-gray-400 dark:text-muted-foreground ml-2">9:43 AM</span>
            </div>
            <div className="mt-1 text-[13px] md:text-[15px] leading-snug text-gray-100 dark:text-foreground">
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
              <button className="bg-[#FEB81D] dark:bg-bright text-black dark:text-bright-foreground text-xs px-3 py-1 rounded font-bold cursor-default">
                Send
              </button>
              <button className="bg-[#2B0808] dark:bg-muted text-white dark:text-foreground text-xs px-3 py-1 rounded font-bold cursor-default">
                edit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SlackInterface;