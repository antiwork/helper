import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "@/db/client";
import { env } from "@/lib/env";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = (opts: { headers: Headers; session: Awaited<ReturnType<typeof auth>> }) => {
  const source = opts.headers.get("x-trpc-source") ?? "unknown";
  // eslint-disable-next-line no-console
  console.log(">>> tRPC Request from", source, "by user ID", opts.session?.userId ?? "Unknown");

  return { session: opts.session };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the trpc api is initialized, connecting the context and
 * transformer
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => {
    if (error.code === "INTERNAL_SERVER_ERROR") {
      return {
        ...shape,
        message: "Something went wrong",
        cause: env.NODE_ENV === "development" ? error.cause : undefined,
      };
    }
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export { t as trpcContext };

/**
 * Adds an artificial delay in development to help catch unwanted waterfalls
 * (by simulating network latency as if it were a production environment).
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // 100-500ms
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  // eslint-disable-next-line no-console
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

const sentryMiddleware = t.middleware(Sentry.trpcMiddleware({ attachRpcInput: true }));

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure = t.procedure.use(sentryMiddleware).use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 */
export const protectedProcedure = t.procedure
  .use(sentryMiddleware)
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    // TODO: different error code? setActive in Clerk?
    if (!ctx.session?.userId || !ctx.session?.orgId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        session: { ...ctx.session, userId: ctx.session.userId, orgId: ctx.session.orgId },
      },
    });
  });

export const getAuthorizedMailbox = cache(
  async (orgId: string, mailboxSlug: string) =>
    await db.query.mailboxes.findFirst({
      where: (mailboxes, { and, eq }) => and(eq(mailboxes.slug, mailboxSlug), eq(mailboxes.clerkOrganizationId, orgId)),
    }),
);
