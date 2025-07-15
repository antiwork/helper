import { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/trpc/react";

const supabase = createClient();

export const useSession = () => {
  const [session, setSession] = useState<Session | null>(null);

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = api.user.currentUser.useQuery(undefined, {
    enabled: !!session, // only fetch after session exists
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      refetch();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, user, isLoading, error, refetch };
};
