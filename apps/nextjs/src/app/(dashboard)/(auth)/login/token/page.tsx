"use client";

import { useAuth, useSignIn, useUser } from "@clerk/nextjs";
import * as Sentry from "@sentry/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Loading from "@/app/(dashboard)/loading";
import { Button } from "@/components/ui/button";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

const validateRedirectUrl = (redirectUrl: string | null) => {
  if (!redirectUrl) return null;
  try {
    const url = new URL(redirectUrl, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return url.toString();
  } catch (error) {
    return null;
  }
};

export default function Page() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { signOut } = useAuth();
  const { signIn, setActive } = useSignIn();
  const { user, isLoaded: clerkLoaded } = useUser();
  const router = useRouter();

  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const signInToken = searchParams.get("token");
  const redirectUrl = validateRedirectUrl(searchParams.get("redirectUrl")) ?? "/mailboxes";

  useEffect(() => {
    if (!clerkLoaded) return;

    if (!signInToken) {
      setError("No token provided");
      return;
    }

    if (userId && user?.id === userId) {
      router.push(redirectUrl);
      return;
    }

    if (!signIn || !setActive || loading) {
      return;
    }

    const createSignIn = async () => {
      setLoading(true);
      try {
        const signInAttempt = await signIn.create({
          strategy: "ticket",
          ticket: signInToken,
        });

        if (signInAttempt.status === "complete") {
          await setActive({
            session: signInAttempt.createdSessionId,
          });
          setTimeout(() => router.push(redirectUrl));
        } else {
          Sentry.captureMessage("Token sign in failed", {
            extra: {
              signInAttempt,
            },
          });
          setError("Token sign in failed");
        }
      } catch (error: any) {
        captureExceptionAndLog(error);
        setError(error.message ?? "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      signOut(createSignIn);
    } else {
      createSignIn();
    }
  }, [clerkLoaded]);

  if (error) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-10">
        <h1 className="text-xl mb-2">Couldn't sign in</h1>
        <p className="text-sm mb-10">{error}</p>
        <Button onClick={() => router.push("/login")}>Go to login</Button>
      </div>
    );
  }
  return <Loading />;
}
