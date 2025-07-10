"use client";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState(env.NODE_ENV === "development" ? "support@gumroad.com" : "");
  const [displayName, setDisplayName] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "displayName" | "otp">("email");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const router = useRouter();
  const { theme, systemTheme } = useTheme();

  const startSignInMutation = api.user.startSignIn.useMutation({
    onSuccess: (data) => {
      if (data.signupPossible) {
        setStep("displayName");
        setEmailError(null);
      } else if (data.email) {
        setStep("otp");
        setEmailError(null);
      } else {
        setDashboardUrl(data.dashboardUrl || null);
        setOtp(data.otp || "");
        setStep("otp");
        setEmailError(null);
      }
    },
    onError: (error) => {
      setEmailError(error.message);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const createUserMutation = api.user.createUser.useMutation({
    onSuccess: () => {
      startSignInMutation.mutate({ email });
    },
    onError: (error) => {
      setDisplayNameError(error.message);
      setIsLoading(false);
    },
  });

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setEmailError(null);

    startSignInMutation.mutate({ email });
  };

  const handleDisplayNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setDisplayNameError(null);

    createUserMutation.mutate({
      email,
      displayName: displayName.trim(),
    });
  };

  const handleOtpSubmit = async () => {
    if (otp.length !== 6) return;

    const supabase = createClient();
    setIsLoading(true);
    setOtpError(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (error) throw error;
      router.push("/mine");
    } catch (error: unknown) {
      captureExceptionAndLog(error);
      setOtpError(error instanceof Error ? error.message : "Invalid OTP");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (otp.length === 6) {
      handleOtpSubmit();
    }
  }, [otp]);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-3">
        <Image
          src={theme === "dark" || systemTheme === "dark" ? "/logo-white.svg" : "/logo.svg"}
          alt="Helper"
          width="110"
          height="32"
          className="w-28"
        />
        <p className="text-sm text-muted-foreground">
          {step === "email"
            ? "Please sign in to continue"
            : step === "displayName"
              ? "Enter your name to create your account"
              : "Enter the verification code sent to your email"}
        </p>
      </div>
      <AnimatePresence mode="wait">
        {step === "email" && (
          <motion.div key="email-form" exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
            <form onSubmit={handleEmailSubmit}>
              <div className="flex flex-col gap-3">
                <div className="relative grid gap-2">
                  <Label htmlFor="email" className="sr-only">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    placeholder="Email"
                    className="pr-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    type="submit"
                    size="sm"
                    iconOnly
                    className="absolute right-1 top-1 mr-px mt-px"
                    disabled={!email || isLoading}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
                {emailError && <p className="text-sm text-red-500">{emailError}</p>}
              </div>
            </form>
          </motion.div>
        )}

        {step === "displayName" && (
          <motion.div
            key="displayname-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <form onSubmit={handleDisplayNameSubmit}>
              <div className="flex flex-col gap-3">
                <div className="relative grid gap-2">
                  <Label htmlFor="displayName" className="sr-only">
                    Display Name
                  </Label>
                  <Input
                    id="displayName"
                    type="text"
                    required
                    autoFocus
                    placeholder="Your name"
                    className="pr-10"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    type="submit"
                    size="sm"
                    iconOnly
                    className="absolute right-1 top-1 mr-px mt-px"
                    disabled={!displayName.trim() || isLoading}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
                {displayNameError && <p className="text-sm text-red-500">{displayNameError}</p>}
              </div>
            </form>
          </motion.div>
        )}

        {step === "otp" && (
          <motion.div
            key="otp-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="otp" className="sr-only">
                  Verification Code
                </Label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={isLoading}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              {dashboardUrl && (
                <Alert variant="bright">
                  You have not yet set up Resend for email sending. You can find the OTP code in the{" "}
                  <a
                    href={dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    Supabase dashboard
                  </a>{" "}
                  instead.
                </Alert>
              )}
              {otpError && <p className="text-sm text-red-500 text-center">{otpError}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
