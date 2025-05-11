"use client";

import { useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import { OAuthStrategy } from "@clerk/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Loading from "@/app/(dashboard)/loading";
import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import AppleLogo from "./icons/apple-logo.svg";
import GitHubLogo from "./icons/github-logo.svg";
import GoogleLogo from "./icons/google-logo.svg";

export function LoginForm() {
  const { isSignedIn } = useUser();
  const { signIn, setActive } = useSignIn();
  const { signUp } = useSignUp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.push("/mailboxes");
    }
  }, [isSignedIn, router]);

  if (!signIn || !signUp) return <Loading />;

  const handleOAuthSignIn = async (strategy: OAuthStrategy) => {
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
        <Logo />
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
