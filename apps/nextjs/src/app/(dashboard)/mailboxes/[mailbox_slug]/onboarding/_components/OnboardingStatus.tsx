"use client";

import { inferRouterOutputs } from "@trpc/server";
import { CheckCircle, ChevronDown, ChevronUp, Globe, Mail, Maximize, MessageSquare, Minimize, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

// Define types for onboarding steps
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
  const [docsUrl, setDocsUrl] = useState("");
  const [loadingWebsite, setLoadingWebsite] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // This would ideally come from the backend, but for now we'll mock it
  // In a real implementation, these would be stored in the onboardingMetadata
  const onboardingSteps: OnboardingStep[] = [
    {
      id: "website",
      title: "Connect Website",
      description: "Connect your website and import documentation",
      icon: <Globe className="h-5 w-5" />,
      completed: mailbox.onboardingMetadata?.websiteConnected ?? false,
    },
    {
      id: "email",
      title: "Connect Email",
      description: "Connect your email to receive notifications",
      icon: <Mail className="h-5 w-5" />,
      completed: mailbox.onboardingMetadata?.emailConnected ?? false,
    },
    {
      id: "widget",
      title: "Add Live-Chat Widget",
      description: "Add the live-chat widget to your website",
      icon: <MessageSquare className="h-5 w-5" />,
      completed: mailbox.onboardingMetadata?.widgetAdded ?? false,
    },
  ];

  const completedSteps = onboardingSteps.filter((step) => step.completed).length;
  const totalSteps = onboardingSteps.length;
  const allStepsCompleted = completedSteps === totalSteps;

  const toggleStep = (stepId: string) => {
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  const handleCompleteStep = async (stepId: string) => {
    setLoading(true);
    try {
      // Call the TRPC endpoint to update the onboarding metadata
      await api.mailbox.completeOnboardingStep.mutate({
        stepId: stepId as "website" | "email" | "widget",
      });
      router.refresh();
    } catch (error) {
      console.error(`Failed to complete onboarding step ${stepId}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunDemo = () => {
    // Implement demo functionality
    console.log("Running demo");
  };

  const handleGoToInbox = () => {
    router.push(`/mailboxes/${mailboxSlug}/conversations`);
  };

  const handleLoadWebsite = () => {
    if (!websiteUrl) return;

    setLoadingWebsite(true);

    // Ensure URL has protocol
    let urlToLoad = websiteUrl;
    if (!/^https?:\/\//i.test(urlToLoad)) {
      urlToLoad = `https://${urlToLoad}`;
      setWebsiteUrl(urlToLoad);
    }

    // Set the src of the iframe to our proxy endpoint with mailbox parameters
    if (frameRef.current) {
      frameRef.current.src = `/api/proxy?url=${encodeURIComponent(urlToLoad)}&mailboxSlug=${encodeURIComponent(mailboxSlug)}`;

      // Add event listener to detect when the iframe has loaded
      frameRef.current.onload = () => {
        setLoadingWebsite(false);
      };

      // Set a timeout in case the iframe fails to load
      setTimeout(() => {
        setLoadingWebsite(false);
      }, 10000);
    }
  };

  // Load website when expanded
  useEffect(() => {
    if (expandedStep === "website" && websiteUrl && !frameRef.current?.src) {
      handleLoadWebsite();
    }
  }, [expandedStep, websiteUrl]);

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="text-center mb-8">
        <Button variant="default" className="bg-yellow-400 hover:bg-yellow-500 text-black" onClick={handleRunDemo}>
          Run Demo
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left side - Steps */}
        <div className="lg:w-2/5 space-y-4">
          {onboardingSteps.map((step) => (
            <Card key={step.id} className={cn(step.completed && "border-green-400 bg-green-50")}>
              <CardHeader className="p-4 cursor-pointer" onClick={() => toggleStep(step.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex items-center justify-center rounded-full w-8 h-8",
                        step.completed ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {step.completed ? <CheckCircle className="h-5 w-5" /> : step.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {step.title}
                        {step.completed && (
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                            Completed
                          </span>
                        )}
                      </CardTitle>
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
                        <label className="block text-sm font-medium mb-1">Website / app URL</label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://your-website.com"
                            value={websiteUrl}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                          />
                          <Button
                            variant="outlined"
                            className="px-3"
                            onClick={handleLoadWebsite}
                            disabled={loadingWebsite}
                          >
                            {loadingWebsite ? (
                              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Globe className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
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
                        onClick={() => handleCompleteStep(step.id)}
                        disabled={loading || step.completed}
                      >
                        Connect Website & Import Docs
                      </Button>
                    </div>
                  )}

                  {step.id === "email" && (
                    <div>
                      <p className="mb-4">Connect your email to receive notifications when new conversations arrive.</p>
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => handleCompleteStep(step.id)}
                        disabled={loading || step.completed}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Connect Email
                      </Button>
                    </div>
                  )}

                  {step.id === "widget" && (
                    <div>
                      <p className="mb-4">
                        Add the live-chat widget to your website to allow your users to get immediate help.
                      </p>
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => handleCompleteStep(step.id)}
                        disabled={loading || step.completed}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Add Live-Chat Widget
                      </Button>
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

        {/* Right side - Fake Browser */}
        <div className="lg:w-3/5">
          <div className="rounded-lg overflow-hidden border border-gray-200 shadow-md">
            {/* Browser Header */}
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

            {/* Browser Content */}
            <div className="bg-white h-[600px] relative">
              {loadingWebsite && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <span className="text-sm text-gray-500">Loading website...</span>
                  </div>
                </div>
              )}
              <iframe ref={frameRef} className="w-full h-full border-0" title="Website Preview with Helper Widget" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
