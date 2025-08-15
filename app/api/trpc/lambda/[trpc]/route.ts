import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { getProfile } from "@/lib/data/user";
import { createClient } from "@/lib/supabase/server";
import { appRouter, createTRPCContext } from "@/trpc";

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
    const profile = await getProfile(authUser.id);
    
    if (profile) {
      enrichedUser = {
        email: authUser.email ?? null,
        ...profile,
      };
    } else {
      // For test environments or missing profiles, create a minimal user object
      enrichedUser = {
        id: authUser.id,
        email: authUser.email ?? null,
        permissions: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc/lambda",
    router: appRouter,
    req,
    createContext: () => {
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
