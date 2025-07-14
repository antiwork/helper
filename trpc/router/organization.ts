import { type TRPCRouterRecord } from "@trpc/server";
import { eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { addUser } from "@/lib/data/user";
import { protectedProcedure } from "../trpc";

export const organizationRouter = {
  getMembers: protectedProcedure.query(async () => {
    const users = await db
      .select({
        id: authUsers.id,
        email: authUsers.email,
        displayName: userProfiles.displayName,
        permissions: userProfiles.permissions,
        access: userProfiles.access,
        deletedAt: userProfiles.deletedAt,
      })
      .from(authUsers)
      .innerJoin(userProfiles, eq(authUsers.id, userProfiles.id))
      .where(isNull(userProfiles.deletedAt));

    return users.map((user) => ({
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
