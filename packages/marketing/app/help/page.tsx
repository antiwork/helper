"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketingHeader } from "../marketingHeader";

export default function HelpPage() {
  return (
    <main className="bg-[#2B0808] text-white min-h-screen">
      <MarketingHeader bgColor="#2B0808" />

      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Help Center</h1>

          <div className="bg-[#412020] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <BookOpen className="w-6 h-6 mr-2" />
              Documentation
            </h2>
            <p className="mb-6">
              Find comprehensive guides and documentation to help you get started with Helper as quickly as possible.
            </p>
            <div className="flex flex-col gap-4">
              <Link
                href="/docs/deployment"
                className="border border-[#5A3A3A] rounded-lg p-4 hover:bg-[#5A3A3A] transition-colors"
              >
                <h3 className="font-medium mb-2">Self Hosting Guide</h3>
                <p className="text-sm text-gray-300">Learn the basics of setting up Helper for your support team</p>
              </Link>
              <Link
                href="/docs/widget/06-custom"
                className="border border-[#5A3A3A] rounded-lg p-4 hover:bg-[#5A3A3A] transition-colors"
              >
                <h3 className="font-medium mb-2">Integration Guides</h3>
                <p className="text-sm text-gray-300">Connect Helper with your site and workflows</p>
              </Link>
            </div>
          </div>

          <div className="bg-[#412020] rounded-xl p-8">
            <h2 className="text-2xl font-semibold mb-4">Need more help?</h2>
            <p className="mb-6">
              Our support team is available to assist you with any questions or issues you may have.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outlined" className="border-amber-500 text-amber-500 hover:bg-amber-500/10" asChild>
                <Link href="/">Return to Home</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
