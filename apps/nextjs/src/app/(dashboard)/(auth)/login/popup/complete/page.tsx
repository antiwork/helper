"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import LoadingSpinner from "@/components/loadingSpinner";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";

export default function CompletePage() {
  const { userId } = useAuth();
  const { data: signInToken } = api.user.getSignInToken.useQuery(undefined, {
    enabled: !!userId,
  });

  useEffect(() => {
    if (userId && signInToken) {
      const redirectUrl = localStorage.getItem("popupLoginRedirectUrl");
      localStorage.removeItem("popupLoginRedirectUrl");
      window.location.href = `antiwork-helper:///login/token?userId=${userId}&token=${signInToken}&redirectUrl=${encodeURIComponent(redirectUrl ?? "/mailboxes")}`;
    }
  }, [userId, signInToken]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background">
      <LoadingSpinner size="lg" />
      <p className="text-lg font-medium my-6 text-center max-w-sm">
        Logging you into the desktop app. You can close this window when you're done.
      </p>
      <Button variant="subtle" onClick={() => window.close()}>
        Close window
      </Button>
    </div>
  );
}
