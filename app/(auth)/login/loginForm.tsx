"use client";

import { Provider } from "@supabase/supabase-js";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Divider from "@/components/divider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import GitHubLogo from "./github-logo.svg";
import GoogleLogo from "./google-logo.svg";
import SlackLogo from "./slack-logo.svg";

const providerNames: Record<Provider, string> = {
  apple: "Apple",
  azure: "Azure",
  bitbucket: "Bitbucket",
  discord: "Discord",
  facebook: "Facebook",
  github: "GitHub",
  gitlab: "GitLab",
  google: "Google",
  keycloak: "Keycloak",
  linkedin_oidc: "LinkedIn",
  notion: "Notion",
  slack_oidc: "Slack",
  spotify: "Spotify",
  workos: "WorkOS",
  zoom: "Zoom",
  figma: "Figma",
  kakao: "Kakao",
  linkedin: "LinkedIn",
  slack: "Slack",
  twitch: "Twitch",
  twitter: "Twitter",
  fly: "Fly",
};

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState(env.NODE_ENV === "development" ? "support@gumroad.com" : "");
  const [password, setPassword] = useState(env.NODE_ENV === "development" ? "password" : "");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { theme, systemTheme } = useTheme();

  const passwordEnabled = env.NEXT_PUBLIC_SUPABASE_AUTH_OPTIONS.includes("password");
  const ssoOptions = env.NEXT_PUBLIC_SUPABASE_AUTH_OPTIONS.filter((option) => option !== "password") as Provider[];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setPasswordError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/mailboxes");
    } catch (error: unknown) {
      captureExceptionAndLog(error);
      setPasswordError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: Provider) => {
    const supabase = createClient();
    setIsLoading(true);
    setOauthError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/oauth?next=/mailboxes`,
        },
      });

      if (error) throw error;
    } catch (error: unknown) {
      captureExceptionAndLog(error);
      setOauthError(error instanceof Error ? error.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="items-center">
          <CardTitle className="text-2xl">
            <Image
              src={theme === "dark" || systemTheme === "dark" ? "/logo-white.svg" : "/logo.svg"}
              alt="Helper"
              width="110"
              height="32"
              className="w-28"
            />
          </CardTitle>
          <CardDescription className="text-muted-foreground">Please sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          {passwordEnabled && (
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                <Button variant="bright" type="submit" className="w-full" disabled={isLoading}>
                  Login
                </Button>
              </div>
            </form>
          )}
          {passwordEnabled && ssoOptions.length > 0 && <Divider label="or" />}
          <div className="flex flex-col gap-4">
            {oauthError && <p className="text-sm text-destructive-500">{oauthError}</p>}
            {ssoOptions.map((option) => (
              <Button
                key={option}
                variant="subtle"
                type="submit"
                className="w-full"
                disabled={isLoading}
                onClick={() => handleSocialLogin(option)}
              >
                {option === "github" ? (
                  <GitHubLogo className="w-4 h-4 mr-2 fill-current" />
                ) : option === "google" ? (
                  <GoogleLogo className="w-4 h-4 mr-2 fill-current" />
                ) : option === "slack_oidc" ? (
                  <SlackLogo className="w-4 h-4 mr-2 fill-current" />
                ) : null}
                Continue with {providerNames[option]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
