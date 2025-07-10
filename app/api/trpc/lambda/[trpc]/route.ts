import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createClient } from "@/lib/supabase/server";
import { appRouter, createTRPCContext } from "@/trpc";
import { db } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export const OPTIONS = () => {
  const response = new Response(null, {
    status: 204,
  });
  return response;
};

const handler = async (req: any) => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let enrichedUser = null;

  if (authUser) {
    const [profile] = await db
      .select({
        displayName: userProfiles.displayName,
        permissions: userProfiles.permissions,
        access: userProfiles.access,
        createdAt: userProfiles.createdAt,
        updatedAt: userProfiles.updatedAt,
      })
      .from(userProfiles)
      .where(eq(userProfiles.id, authUser.id))
      .limit(1);

    enrichedUser = {
      id: authUser.id,
      email: authUser.email,
      ...profile,
    };
  }

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc/lambda",
    router: appRouter,
    req,
    createContext: async () => {
      return createTRPCContext({
        user: enrichedUser,
        headers: req.headers,
      });
    },
    onError({ error, path }) {
      // eslint-disable-next-line no-console
      console.error(`>>> tRPC Error on '${path}'`, error);
      if (error.cause) {
        // eslint-disable-next-line no-console
        console.error(error.cause.stack);
      }
    },
  });

  return response;
};

export { handler as GET, handler as POST };
