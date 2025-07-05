import { type TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "@/db/client";
import { addUser } from "@/lib/data/user";
import { protectedProcedure } from "../trpc";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export const organizationRouter = {
  getMembers: protectedProcedure.query(async () => {
    const users = await db.query.userProfiles.findMany();
    return users.map((user) => ({
      id: user.id,
      displayName: user?.displayName ?? user.email ?? user.id,
      email: user.email,
    }));
  }),
  addMember: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        displayName: z.string(),
        permissions: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await addUser(ctx.user.id, input.email, input.displayName, input.permissions);
    }),
    updateLastMailboxSlug: protectedProcedure
    .input(z.object({ mailboxSlug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(userProfiles)
        .set({ lastMailboxSlug: input.mailboxSlug })
        .where(eq(userProfiles.id, ctx.user.id));
    }),
} satisfies TRPCRouterRecord;
