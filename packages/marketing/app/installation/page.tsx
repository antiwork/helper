"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketingHeader } from "../marketingHeader";

function track(event: string, payload: Record<string, string> = {}) {
  try {
    // If a real analytics lib exists, prefer it. Otherwise no-op.
    // @ts-ignore
    if (typeof window !== "undefined" && window.analytics?.track) {
      // @ts-ignore
      window.analytics.track(event, payload);
    } else if (typeof window !== "undefined") {
      // Fallback for local dev
      console.log("analytics:", event, payload);
    }
  } catch {
    // ignore analytics errors in dev
  }
}

export default function InstallationPage() {
  return (
    <main className="bg-[#2B0808] text-white flex flex-col min-h-screen">
      <MarketingHeader bgColor="#2B0808" />

      <section className="pt-28 pb-16 border-b border-white/10">
        <div className="container mx-auto px-4 max-w-5xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-secondary dark:text-foreground">
            White‑glove installation
          </h1>
          <p className="text-xl text-secondary dark:text-foreground mb-6">
            Fixed fee of <span className="font-semibold text-[#FFE6B0]">$10,000</span> for end‑to‑end setup and rollout.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-secondary dark:text-foreground">
            <li>Implement across your website, email, and Slack workflows</li>
            <li>Live chat + in‑app support center like Stripe and GitHub</li>
            <li>Content ingestion, policy tuning, and quality guardrails</li>
            <li>Stakeholder training and go‑live checklist</li>
          </ul>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button
              className="bg-bright hover:bg-[#FFEDC2] text-black hover:text-black font-medium px-6 py-4 rounded-md text-base"
              asChild
              onClick={() => track("cta_installation_email", { surface: "installation_page" })}
            >
              <a href="mailto:sales@helper.ai?subject=Helper%20Installation%20($10k)&body=Hi%20Helper%20team,%0A%0AWe'd%20like%20to%20discuss%20the%20$10k%20white-glove%20installation.%0A%0ACompany:%0AWebsite:%0ATimeline:%0A%0AThanks!">Contact sales</a>
            </Button>

            <Button
              variant="outlined_subtle"
              className="px-6 py-4 rounded-md text-base border border-white/20"
              asChild
              onClick={() => track("cta_installation_slack", { surface: "installation_page" })}
            >
              <Link href="/help">Discuss in Slack/Help</Link>
            </Button>

            <Button
              variant="outlined_subtle"
              className="px-6 py-4 rounded-md text-base border border-white/20"
              asChild
              onClick={() => track("cta_installation_live_chat", { surface: "installation_page" })}
            >
              <Link href="/help">Live chat</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[rgba(99,72,71,0.3)] rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-2 text-[#FFE6B0]">Website</h3>
            <p className="text-secondary dark:text-foreground">Embed the widget, index your docs, and surface contextual help.</p>
          </div>
          <div className="bg-[rgba(99,72,71,0.3)] rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-2 text-[#FFE6B0]">Email</h3>
            <p className="text-secondary dark:text-foreground">Draft replies, auto‑triage, and ensure consistent tone and policy.</p>
          </div>
          <div className="bg-[rgba(99,72,71,0.3)] rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-2 text-[#FFE6B0]">Slack</h3>
            <p className="text-secondary dark:text-foreground">Escalations, VIP alerts, and <span className="font-semibold">@helper</span> for instant context.</p>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="bg-[rgba(99,72,71,0.3)] rounded-2xl p-8">
            <h3 className="text-2xl font-semibold mb-2 text-[#FFE6B0]">What’s included</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-secondary dark:text-foreground">
              <ul className="list-disc pl-6 space-y-2">
                <li>Discovery and success criteria</li>
                <li>Widget & identity integration</li>
                <li>Content ingestion + fine‑tuning</li>
              </ul>
              <ul className="list-disc pl-6 space-y-2">
                <li>Slack + email workflows</li>
                <li>QA, launch plan, training</li>
                <li>Two weeks hypercare</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


