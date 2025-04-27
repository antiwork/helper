"use client";

import { useSignIn } from "@clerk/nextjs";
import { OAuthStrategy } from "@clerk/types";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import LoadingSpinner from "@/components/loadingSpinner";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

export default function PopupPage() {
  const { signIn } = useSignIn();
  const searchParams = useSearchParams();
  const strategy = searchParams.get("strategy") as OAuthStrategy;

  useEffect(() => {
    const startAuth = async () => {
      if (!signIn || !strategy) return;

      localStorage.setItem("popupLoginRedirectUrl", searchParams.get("redirectUrl") ?? "");

      try {
        await signIn.authenticateWithRedirect({
          strategy,
          redirectUrl: "/login/sso-callback?popup=true",
          redirectUrlComplete: "/login/popup/complete",
        });
      } catch (err) {
        if (err instanceof Error && (err as any).errors?.[0]?.code === "session_exists") {
          window.location.replace("/login/popup/complete");
        } else {
          captureExceptionAndLog(err);
          window.close();
        }
      }
    };

    startAuth();
  }, [signIn, strategy]);

  return (
    <div className="h-dvh flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
