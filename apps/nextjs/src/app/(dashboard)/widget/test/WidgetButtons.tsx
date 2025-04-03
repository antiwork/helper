"use client";

import { useHelper } from "@helperai/react";

export function WidgetButtons() {
  const { toggle, sendPrompt } = useHelper();

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-white">Using hooks:</h3>
        <button
          className="focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-primary-foreground transition duration-300 hover:bg-blue-600 focus:outline-none"
          onClick={() => {
            sendPrompt("How do I create a membership product?");
          }}
        >
          Get Help (hooks)
        </button>

        <button
          onClick={toggle}
          className="ml-4 focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-primary-foreground transition duration-300 hover:bg-blue-600 focus:outline-none"
        >
          Toggle widget (hooks)
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-white">Using data attributes:</h3>
        <button
          data-helper-prompt="How do I create a membership product?"
          className="focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-primary-foreground transition duration-300 hover:bg-blue-600 focus:outline-none"
        >
          Get Help (data-attr)
        </button>

        <button
          data-helper-toggle
          className="ml-4 focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-primary-foreground transition duration-300 hover:bg-blue-600 focus:outline-none"
        >
          Toggle widget (data-attr)
        </button>
      </div>

      <div className="space-y-2 mt-6">
        <h3 className="text-sm font-medium text-white">Change refund policy to 3 months:</h3>
        <button
          data-helper-start-guide="Change my refund policy to 3 months - Go to the Settings page, scroll down to the Refund Policy section, and select a 3 months refund policy from the dropdown menu. If needed, you can also add fine print to describe your policy in more detail."
          className="focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-primary-foreground transition duration-300 hover:bg-blue-600 focus:outline-none"
        >
          Start guide (data-attr)
        </button>
      </div>
    </div>
  );
}
