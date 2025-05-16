import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "@/db/client";
import { createInvitation } from "@/lib/data/user";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { protectedProcedure } from "../trpc";

export const organizationRouter = {
  getMembers: protectedProcedure.query(async () => {
    const users = await db.query.authUsers.findMany();
    return users.map((user) => ({
      id: user.id,
      displayName: user.user_metadata?.display_name ?? user.email ?? user.id,
      email: user.email,
    }));
  }),
  inviteMember: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await createInvitation(ctx.user.id, input.email);
      } catch (error) {
        captureExceptionAndLog(error, {
          extra: {
            email: input.email,
            userId: ctx.user.id,
          },
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to invite team member",
        });
      }
    }),
} satisfies TRPCRouterRecord;
