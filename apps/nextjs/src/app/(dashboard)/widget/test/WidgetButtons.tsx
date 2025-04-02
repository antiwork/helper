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

        <button
          data-helper-start-guide="How do I change my refund policy to 30 days?"
          className="ml-4 focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-primary-foreground transition duration-300 hover:bg-blue-600 focus:outline-none"
        >
          Start guide (data-attr)
        </button>
      </div>
    </div>
  );
}
