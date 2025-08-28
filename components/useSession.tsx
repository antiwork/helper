"use client";

import { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/trpc/react";

type SessionContextType = {
  session: Session | null;
  user: any; // Type from your TRPC user query
  isLoading: boolean;
  error: any;
  refetch: () => void;
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const supabase = createClient();

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = api.user.currentUser.useQuery(undefined, {
    enabled: !!session,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        setSession(session);
        refetch();
      }
    });

    return () => subscription.unsubscribe();
  }, [refetch]);

  return (
    <SessionContext.Provider
      value={{
        session,
        user,
        isLoading,
        error,
        refetch,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSessionContext must be used within a SessionProvider");
  }
  return context;
};
