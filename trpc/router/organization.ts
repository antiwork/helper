import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "@/db/client";
import { addUser } from "@/lib/data/user";
import { protectedProcedure } from "../trpc";

export const organizationRouter = {
  getMembers: protectedProcedure.query(async () => {
    const users = await db.query.userProfiles.findMany();
    return users
      .filter((user) => user.deletedAt === null)
      .map((user) => ({
        id: user.id,
        displayName: user.displayName || "",
        email: user.email || "",
        permissions: user.permissions,
        access: user.access || { role: "afk", keywords: [] },
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
} satisfies TRPCRouterRecord;
