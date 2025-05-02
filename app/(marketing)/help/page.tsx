"use client";

import { BookOpenIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketingHeader } from "../MarketingHeader";

export default function HelpPage() {
  return (
    <main className="bg-[#2B0808] text-white min-h-screen">
      <div className="fixed top-0 left-0 right-0 z-50">
        <MarketingHeader bgColor="#2B0808" />
      </div>

      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Help Center</h1>

          <div className="bg-[#412020] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <BookOpenIcon className="w-6 h-6 mr-2" />
              Documentation
            </h2>
            <p className="mb-6">
              Find comprehensive guides and documentation to help you get started with Helper as quickly as possible.
            </p>
            <div className="space-y-4">
              <div className="border border-[#5A3A3A] rounded-lg p-4 hover:bg-[#5A3A3A] transition-colors">
                <h3 className="font-medium mb-2">Getting Started Guide</h3>
                <p className="text-sm text-gray-300">Learn the basics of setting up Helper for your support team</p>
              </div>
              <div className="border border-[#5A3A3A] rounded-lg p-4 hover:bg-[#5A3A3A] transition-colors">
                <h3 className="font-medium mb-2">API Reference</h3>
                <p className="text-sm text-gray-300">Detailed information about Helper's API endpoints</p>
              </div>
              <div className="border border-[#5A3A3A] rounded-lg p-4 hover:bg-[#5A3A3A] transition-colors">
                <h3 className="font-medium mb-2">Integration Guides</h3>
                <p className="text-sm text-gray-300">Connect Helper with your existing tools and workflows</p>
              </div>
            </div>
          </div>

          <div className="bg-[#412020] rounded-xl p-8">
            <h2 className="text-2xl font-semibold mb-4">Need more help?</h2>
            <p className="mb-6">
              Our support team is available to assist you with any questions or issues you may have.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="bg-amber-500 hover:bg-amber-600 text-black">Contact Support</Button>
              <Link href="/" passHref>
                <Button variant="outlined" className="border-amber-500 text-amber-500 hover:bg-amber-500/10">
                  Return to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
