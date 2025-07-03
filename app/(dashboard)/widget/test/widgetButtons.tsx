"use client";

import { useHelper } from "@helperai/react";

export function WidgetButtons() {
  const { toggle, sendPrompt } = useHelper();

  return (
    <div className="flex gap-4 helper-widget-test-buttons text-xs">
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
          className="focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-primary-foreground transition duration-300 hover:bg-blue-600 focus:outline-none"
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
          className="focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-primary-foreground transition duration-300 hover:bg-blue-600 focus:outline-none"
        >
          Toggle widget (data-attr)
        </button>
      </div>

      <div className="space-y-2 mt-2">
        <h3 className="text-sm font-medium text-white">Change refund policy to 3 months:</h3>
        <button
          data-helper-prompt="Change my refund policy to 3 months - Go to the Settings page, scroll down to the Refund Policy section, and select a 3 months refund policy from the dropdown menu. If needed, you can also add fine print to describe your policy in more detail."
          className="focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-primary-foreground transition duration-300 hover:bg-blue-600 focus:outline-none text-xs"
        >
          Prompt to change refund policy to 3 months
        </button>
        <button
          data-helper-prompt="Create a 50% off discount for all products - Go to the Discounts tab on the Checkout page, click 'New discount', enter '50off' as the discount code, select 'All products', and set the discount to 50% off."
          className="focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-primary-foreground transition duration-300 hover:bg-blue-600 focus:outline-none text-xs"
        >
          Prompt to create 50% off discount
        </button>
      </div>
    </div>
  );
}
