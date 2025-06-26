"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useSession } from "@/components/hooks/use-session";

export const SentryContext = () => {
  const { user } = useSession() ?? {};
  useEffect(() => {
    Sentry.setUser({ id: user?.id, email: user?.email });
  }, [user]);

  return null;
};
