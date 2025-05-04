import { type TRPCRouterRecord } from "@trpc/server";
import { clerkClient } from "@/lib/data/user";
import { protectedProcedure } from "../trpc";

export const userRouter = {
  getSignInToken: protectedProcedure.query(async ({ ctx }) => {
    const signInToken = await clerkClient.signInTokens.createSignInToken({
      userId: ctx.session.userId,
      expiresInSeconds: 60 * 60 * 24,
    });
    return signInToken.token;
  }),
} satisfies TRPCRouterRecord;
