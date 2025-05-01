import { userRouter } from "@/trpc/router/user";
import { billingRouter } from "./router/billing";
import { gmailSupportEmailRouter } from "./router/gmailSupportEmail";
import { mailboxRouter } from "./router/mailbox";
import { organizationRouter } from "./router/organization";
import { createTRPCRouter, publicProcedure } from "./trpc";

export const appRouter = createTRPCRouter({
  mailbox: mailboxRouter,
  organization: organizationRouter,
  user: userRouter,
  gmailSupportEmail: gmailSupportEmailRouter,
  billing: billingRouter,
  isSignedIn: publicProcedure.query(({ ctx }) => !!ctx.session?.userId),
});

// export type definition of API
export type AppRouter = typeof appRouter;
