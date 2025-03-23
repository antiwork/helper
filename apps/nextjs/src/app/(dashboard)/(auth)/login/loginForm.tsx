"use client";

import { useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import { OAuthStrategy } from "@clerk/types";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Loading from "@/app/(dashboard)/loading";
import { Button } from "@/components/ui/button";
import { getTauriPlatform, useNativePlatform } from "@/components/useNativePlatform";
import { env } from "@/env";
import { api } from "@/trpc/react";
import AppleLogo from "./icons/apple-logo.svg";
import GitHubLogo from "./icons/github-logo.svg";
import GoogleLogo from "./icons/google-logo.svg";

export function LoginForm() {
  const { isSignedIn } = useUser();
  const { signIn, setActive } = useSignIn();
  const { signUp } = useSignUp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, systemTheme } = useTheme();
  const { isTauri, nativePlatform } = useNativePlatform();
  const router = useRouter();
  const appleSignInMutation = api.user.nativeAppleSignIn.useMutation();

  useEffect(() => {
    if (isSignedIn) {
      router.push("/mailboxes");
    }
  }, [isSignedIn, router]);

  useEffect(() => {
    if (getTauriPlatform() === "macos") {
      let unlistenComplete = () => {};
      let unlistenError = () => {};

      listen<{ code: string; firstName: string | null; lastName: string | null }>(
        "apple-sign-in-complete",
        async (event) => {
          console.log("apple-sign-in-complete", event);
          const token = await appleSignInMutation.mutateAsync({
            code: event.payload.code,
            firstName: event.payload.firstName ?? "",
            lastName: event.payload.lastName ?? "",
          });
          router.push(`/login/token?token=${token}`);
        },
      ).then((l) => {
        unlistenComplete = l;
      });

      listen("apple-sign-in-error", (event) => {
        console.error("apple-sign-in-error", event);
        setError("An error occurred during sign in. Please try again.");
        setLoading(false);
      }).then((l) => {
        unlistenError = l;
      });

      return () => {
        unlistenComplete();
        unlistenError();
      };
    }
  }, []);

  if (!signIn || !signUp) return <Loading />;

  const handleOAuthSignIn = async (strategy: OAuthStrategy) => {
    if (nativePlatform === "macos" && strategy === "oauth_apple" && (await invoke("is_mac_app_store"))) {
      setLoading(true);
      await invoke("start_apple_sign_in");
    } else if (isTauri) {
      await openUrl(`${window.location.origin}/login/popup?strategy=${strategy}&deepLink=true`);
    } else {
      try {
        setError(null);
        setLoading(true);

        await signIn.authenticateWithRedirect({
          strategy,
          redirectUrl: "/login/sso-callback",
          redirectUrlComplete: "/mailboxes",
        });
      } catch (err) {
        console.error("OAuth error:", err);
        setError("An error occurred during sign in. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDevSignIn = async () => {
    try {
      setError(null);
      setLoading(true);

      const signInAttempt = await signIn.create({
        identifier: "support@gumroad.com",
        password: "password",
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.push("/mailboxes");
      } else {
        console.error("Sign in not complete:", signInAttempt);
        setError("Failed to sign in with dev account");
      }
    } catch (err) {
      console.error("Dev sign in error:", err);
      setError("Failed to sign in with dev account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-8 flex flex-col items-center gap-4">
        <Image
          src={theme === "dark" || systemTheme === "dark" ? "/logo-white.svg" : "/logo.svg"}
          alt="Helper"
          width="110"
          height="32"
          className="w-28"
        />
        <p className="text-sm text-muted-foreground">Please sign in or sign up to continue</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button variant="subtle" onClick={() => handleOAuthSignIn("oauth_google")} disabled={loading}>
          <GoogleLogo className="w-4 h-4 mr-2 fill-current" />
          Continue with Google
        </Button>

        <Button variant="subtle" onClick={() => handleOAuthSignIn("oauth_github")} disabled={loading}>
          <GitHubLogo className="w-4 h-4 mr-2 fill-current" />
          Continue with GitHub
        </Button>

        <Button variant="subtle" onClick={() => handleOAuthSignIn("oauth_apple")} disabled={loading}>
          <AppleLogo className="w-4 h-4 mr-2 fill-current" />
          Continue with Apple
        </Button>

        {env.NEXT_PUBLIC_VERCEL_ENV !== "production" && (
          <Button onClick={handleDevSignIn} disabled={loading} variant="link">
            Sign in as support@gumroad.com (Dev)
          </Button>
        )}

        {error && <p className="text-center text-destructive">{error}</p>}
      </div>
    </>
  );
}
