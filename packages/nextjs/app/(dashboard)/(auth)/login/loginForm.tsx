"use client";

import { useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import { OAuthStrategy } from "@clerk/types";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Loading from "@/app/(dashboard)/loading";
import { Button } from "@/components/ui/button";
import { getTauriPlatform, useNativePlatform } from "@/components/useNativePlatform";
import WavingHand from "@/components/wavingHand";
import { env } from "@/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { api } from "@/trpc/react";
import AppleLogo from "./icons/apple-logo.svg";
import GitHubLogo from "./icons/github-logo.svg";
import GoogleLogo from "./icons/google-logo.svg";

export function LoginForm() {
  const { isSignedIn, isLoaded } = useUser();
  const { signIn, setActive } = useSignIn();
  const { signUp } = useSignUp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, systemTheme } = useTheme();
  const { isTauri, nativePlatform } = useNativePlatform();
  const router = useRouter();
  const appleSignInMutation = api.user.nativeAppleSignIn.useMutation();

  const searchParams = useSearchParams();
  const desktopRedirectUrl = `/desktop/manager?initialTabUrl=${encodeURIComponent(searchParams.get("initialTabUrl") ?? "")}`;

  useEffect(() => {
    if (isSignedIn) {
      router.push("/mailboxes");
    }
    if (isLoaded && !isSignedIn && getTauriPlatform()) {
      invoke("close_all_tabs");
    }
  }, [isSignedIn, isLoaded, router]);

  useEffect(() => {
    if (getTauriPlatform() === "macos") {
      let unlistenComplete = () => {};
      let unlistenError = () => {};

      listen<{ code: string; firstName: string | null; lastName: string | null }>(
        "apple-sign-in-complete",
        async (event) => {
          const token = await appleSignInMutation.mutateAsync({
            code: event.payload.code,
            firstName: event.payload.firstName ?? "",
            lastName: event.payload.lastName ?? "",
          });
          router.push(`/login/token?token=${token}&redirectUrl=${encodeURIComponent(desktopRedirectUrl)}`);
        },
      ).then((l) => {
        unlistenComplete = l;
      });

      listen("apple-sign-in-error", (event) => {
        // eslint-disable-next-line no-console
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
      setLoading(true);
      const window = new WebviewWindow("login-popup", {
        url: `${location.origin}/login/popup?strategy=${strategy}&tauri=true&redirectUrl=${encodeURIComponent(desktopRedirectUrl)}`,
        width: 600,
        height: 600,
        title: "Sign in",
      });
      window.once("tauri://created", function () {
        window.show();
      });
      window.once("tauri://error", function (e) {
        captureExceptionAndLog(e);
      });
      window.once("tauri://close-requested", () => {
        setLoading(false);
        window.destroy();
      });
      window.listen("logged-in", () => {
        window.close();
        router.push("/desktop/manager");
      });
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
        captureExceptionAndLog(err);
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
        router.push(isTauri ? desktopRedirectUrl : "/mailboxes");
      } else {
        // eslint-disable-next-line no-console
        console.error("Sign in not complete:", signInAttempt);
        setError("Failed to sign in with dev account");
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Dev sign in error:", err);
      setError("Failed to sign in with dev account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="flex items-center">
          <WavingHand />
          <Image
            src={theme === "dark" || systemTheme === "dark" ? "/logo-text-white.svg" : "/logo-text.svg"}
            alt="Helper"
            width="82"
            height="32"
            className="w-20"
          />
        </div>
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
