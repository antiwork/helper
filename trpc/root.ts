import { userRouter } from "@/trpc/router/user";
import { gmailSupportEmailRouter } from "./router/gmailSupportEmail";
import { mailboxRouter } from "./router/mailbox";
import { organizationRouter } from "./router/organization";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  mailbox: mailboxRouter,
  organization: organizationRouter,
  gmailSupportEmail: gmailSupportEmailRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
