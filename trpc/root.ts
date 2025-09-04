import { generateSampleQuestions } from "@/lib/ai/sampleQuestions";
import { userRouter } from "@/trpc/router/user";
import { gmailSupportEmailRouter } from "./router/gmailSupportEmail";
import { mailboxRouter } from "./router/mailbox";
import { organizationRouter } from "./router/organization";
import { createTRPCRouter, publicProcedure } from "./trpc";

export const appRouter = createTRPCRouter({
  mailbox: mailboxRouter,
  organization: organizationRouter,
  gmailSupportEmail: gmailSupportEmailRouter,
  user: userRouter,
  sampleQuestions: publicProcedure.query(async () => {
    return await generateSampleQuestions();
  }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
