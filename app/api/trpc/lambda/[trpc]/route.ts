import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createClient } from "@/lib/supabase/server";
import { appRouter, createTRPCContext } from "@/trpc";

export const OPTIONS = () => {
  const response = new Response(null, {
    status: 204,
  });
  return response;
};

const handler = async (req: any) => {
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc/lambda",
    router: appRouter,
    req,
    createContext: async () => {
      const supabase = await createClient();
      return createTRPCContext({
        user: (await supabase.auth.getUser()).data.user,
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
