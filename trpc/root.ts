import { gmailSupportEmailRouter } from "./router/gmailSupportEmail";
import { mailboxRouter } from "./router/mailbox";
import { organizationRouter } from "./router/organization";
import { createTRPCRouter, publicProcedure } from "./trpc";

export const appRouter = createTRPCRouter({
  mailbox: mailboxRouter,
  organization: organizationRouter,
  gmailSupportEmail: gmailSupportEmailRouter,
  isSignedIn: publicProcedure.query(({ ctx }) => !!ctx.user),
});

// export type definition of API
export type AppRouter = typeof appRouter;
