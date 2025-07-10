"use client";

import { ArrowRight } from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

export function OnboardingForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { theme, systemTheme } = useTheme();

  const onboardMutation = api.user.onboard.useMutation({
    onSuccess: async (data) => {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: data.otp,
        type: "email",
      });

      if (error) {
        setFormError(error.message);
        setIsLoading(false);
        return;
      }
      router.push("/mine");
    },
    onError: (error) => {
      setFormError(error.message);
      setIsLoading(false);
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);

    onboardMutation.mutate({
      email,
      displayName: displayName.trim(),
    });
  };

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
        <p className="text-sm text-muted-foreground">Welcome! Let's set up your Helper account</p>
      </div>
      <form onSubmit={handleFormSubmit}>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email" className="sr-only">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              autoFocus
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="displayName" className="sr-only">
              Display Name
            </Label>
            <Input
              id="displayName"
              type="text"
              required
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <Button
            variant="bright"
            type="submit"
            className="w-full"
            disabled={!email || !displayName.trim() || isLoading}
          >
            {isLoading ? "Setting up your account..." : "Start using Helper"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          {formError && <p className="text-sm text-red-500">{formError}</p>}
        </div>
      </form>
    </div>
  );
}
