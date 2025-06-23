import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "@/db/client";
import { addUser, removeUser } from "@/lib/data/user";
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
  addMember: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        displayName: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await addUser(ctx.user.id, input.email, input.displayName);
    }),
  removeMember: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "core") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You do not have permission to remove team members.",
        });
      }

      if (ctx.user.id === input.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove yourself.",
        });
      }

      await removeUser(input.id);
    }),
} satisfies TRPCRouterRecord;
