"use client";

import Link from "next/link";
import { MarketingHeader } from "../../components/MarketingHeader";
import { Button } from "../../components/ui/button";

export default function HelpPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#3D0C11" }}>
      <MarketingHeader />

      <main className="flex-grow flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-4xl w-full space-y-12">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
              Help Center
            </h1>
            <p className="mt-5 max-w-xl mx-auto text-xl text-gray-300">Find resources and support for Helper</p>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Documentation</h2>
              <div className="mt-4 space-y-4">
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Self-hosting Guide</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Learn how to self-host Helper on your own infrastructure.
                  </p>
                  <div className="mt-3">
                    <Link href="/docs/self-hosting">
                      <Button variant="secondary" size="sm">
                        View guide
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Integration Guide</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Learn how to integrate Helper with your existing systems.
                  </p>
                  <div className="mt-3">
                    <Link href="/docs/integration">
                      <Button variant="secondary" size="sm">
                        View guide
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contact Support</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Need help with something specific? Our support team is here to help.
              </p>
              <div className="mt-5">
                <Link href="mailto:support@helper.ai">
                  <Button>Contact support</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
