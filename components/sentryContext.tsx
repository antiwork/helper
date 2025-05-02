"use client";

import { useUser } from "@clerk/nextjs";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export const SentryContext = () => {
  const { user } = useUser();
  useEffect(() => {
    Sentry.setUser({ id: user?.id, email: user?.primaryEmailAddress?.emailAddress });
  }, [user]);

  return null;
};
