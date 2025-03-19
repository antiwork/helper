"use client";

import { inferRouterOutputs } from "@trpc/server";
import { BookOpen, CheckCircle, ChevronDown, ChevronUp, Mail, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AppRouter } from "@/trpc";
import { api } from "@/trpc/react";

type RouterOutputs = inferRouterOutputs<AppRouter>;

type OnboardingStatusProps = {
  mailboxSlug: string;
  mailbox: RouterOutputs["mailbox"]["get"];
};

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
};

export function OnboardingStatus({ mailboxSlug, mailbox }: OnboardingStatusProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>("website");
  const [websiteUrl, setWebsiteUrl] = useState("https://google.com");
  const [debouncedWebsiteUrl] = useDebounce(websiteUrl, 1000);
  const [docsUrl, setDocsUrl] = useState("");
  const [loadingWebsite, setLoadingWebsite] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const completeOnboardingStepMutation = api.mailbox.completeOnboardingStep.useMutation();

  const onboardingSteps: OnboardingStep[] = [
    {
      id: "website",
      title: "Add knowledge from your website",
      description: "Connect your website and import documentation to build Helper's knowledge base",
      icon: <BookOpen className="h-5 w-5" />,
      completed: mailbox.onboardingMetadata?.websiteConnected ?? false,
    },
    {
      id: "communication",
      title: "Connect Helper to your email or website",
      description: "Select at least one channel to communicate with your customers",
      icon: <MessageSquare className="h-5 w-5" />,
      completed: (mailbox.onboardingMetadata?.emailConnected || mailbox.onboardingMetadata?.widgetAdded) ?? false,
    },
  ];

  const completedSteps = onboardingSteps.filter((step) => step.completed).length;
  const totalSteps = onboardingSteps.length;
  const allStepsCompleted = completedSteps === totalSteps;

  const toggleStep = (stepId: string) => {
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  const handleCompleteStep = (stepId: string) => {
    setLoading(true);
    try {
      completeOnboardingStepMutation.mutate({
        mailboxSlug,
        stepId: stepId as "website" | "email" | "widget",
      });
    } catch (error) {
      console.error(`Failed to complete onboarding step ${stepId}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectEmail = () => {
    location.href = `/api/connect/google?mailbox=${mailboxSlug}&redirect=/mailboxes/${mailboxSlug}/onboarding`;
  };

  const handleGoToInbox = () => {
    router.push(`/mailboxes/${mailboxSlug}/conversations`);
  };

  useEffect(() => {
    if (expandedStep === "website" && debouncedWebsiteUrl) {
      handleLoadWebsite();
    }
  }, [expandedStep, debouncedWebsiteUrl]);

  const handleLoadWebsite = () => {
    if (!debouncedWebsiteUrl) return;

    setLoadingWebsite(true);

    let urlToLoad = debouncedWebsiteUrl;
    if (!/^https?:\/\//i.test(urlToLoad)) {
      urlToLoad = `https://${urlToLoad}`;
      setWebsiteUrl(urlToLoad);
    }

    if (frameRef.current) {
      frameRef.current.src = `/api/proxy?url=${encodeURIComponent(urlToLoad)}&mailboxSlug=${encodeURIComponent(mailboxSlug)}`;

      frameRef.current.onload = () => {
        setLoadingWebsite(false);
      };

      setTimeout(() => {
        setLoadingWebsite(false);
      }, 10000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">Set up your Helper </h1>
        <p className="text-lg text-muted-foreground max-w-4xl mx-auto">
          Complete these tasks to create your AI-powered assistant
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/5 space-y-4">
          {onboardingSteps.map((step) => (
            <Card key={step.id} className={cn(step.completed ? "border-green-200 border-opacity-70" : "")}>
              <CardHeader className="p-4 cursor-pointer" onClick={() => toggleStep(step.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex items-center justify-center rounded-full w-8 h-8 p-2",
                        step.completed ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {step.completed ? <CheckCircle className="h-5 w-5" /> : step.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">{step.title}</CardTitle>
                      <CardDescription className="text-sm">{step.description}</CardDescription>
                    </div>
                  </div>
                  {expandedStep === step.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardHeader>

              {expandedStep === step.id && (
                <CardContent className="px-4 border-t py-6">
                  {step.id === "website" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Website URL</label>
                        <Input
                          placeholder="https://your-website.com"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Documentation URL</label>
                        <Input
                          placeholder="https://your-website.com/docs"
                          value={docsUrl}
                          onChange={(e) => setDocsUrl(e.target.value)}
                        />
                      </div>
                      <Button
                        variant="default"
                        className="bg-primary w-full mt-2"
                        onClick={() => handleCompleteStep("website")}
                        disabled={loading || step.completed}
                      >
                        Turn into AI knowledge
                      </Button>
                    </div>
                  )}

                  {step.id === "communication" && (
                    <div className="space-y-6">
                      <div className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-5 w-5 text-blue-500" />
                          <h3 className="font-medium">Email Communication</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Connect your support email (Gmail account supported) to receive and respond to customer
                          inquiries.
                        </p>
                        <Button
                          variant="default"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                          onClick={handleConnectEmail}
                          disabled={loading || mailbox.onboardingMetadata?.emailConnected}
                        >
                          {mailbox.onboardingMetadata?.emailConnected ? (
                            <span className="flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 mr-2" /> Email Connected
                            </span>
                          ) : (
                            <span className="flex items-center justify-center">
                              <Mail className="h-4 w-4 mr-2" /> Connect Support Email
                            </span>
                          )}
                        </Button>
                      </div>

                      <div className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-purple-500" />
                          <h3 className="font-medium">Live Chat Widget</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Add the live-chat widget to your website to allow your users to get immediate help.
                        </p>
                        <Button
                          variant="default"
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium"
                          onClick={() => handleCompleteStep("widget")}
                          disabled={loading || mailbox.onboardingMetadata?.widgetAdded}
                        >
                          {mailbox.onboardingMetadata?.widgetAdded ? (
                            <span className="flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 mr-2" /> Widget Added
                            </span>
                          ) : (
                            <span className="flex items-center justify-center">
                              <MessageSquare className="h-4 w-4 mr-2" /> Add Live-Chat Widget
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}

          <div className="flex justify-center mt-8">
            <Button variant="default" size="lg" className="px-8 relative" onClick={handleGoToInbox}>
              Go to Inbox
              <span className="ml-2 inline-block transform translate-y-px">→</span>
            </Button>
          </div>
        </div>

        <div className="lg:w-3/5">
          <div className="rounded-lg overflow-hidden border border-gray-200 border-opacity-40 shadow-md">
            <div className="bg-gray-100 p-2 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex-1 mx-4">
                  <div className="flex items-center bg-white rounded-md border border-gray-200 px-3 py-1">
                    <span className="text-xs text-gray-500 truncate">{websiteUrl}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white h-[600px] relative">
              {loadingWebsite && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <span className="text-sm text-gray-500">Loading website...</span>
                  </div>
                </div>
              )}
              <iframe
                ref={frameRef}
                className="w-full h-full border-0"
                title="Website Preview with Helper Widget"
                sandbox="allow-same-origin allow-scripts allow-forms"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
