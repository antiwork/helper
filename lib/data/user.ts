import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db/client";
import { userProfiles } from "@/db/schema/userProfiles";
import { authUsers } from "@/db/supabaseSchema/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getFullName } from "../auth/authUtils";
import { getSlackUser } from "../slack/client";

export const UserRoles = {
  CORE: "core",
  NON_CORE: "nonCore",
  AFK: "afk",
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];

type MailboxAccess = {
  role: UserRole;
  keywords: string[];
  updatedAt: string;
};

export type UserWithMailboxAccessData = {
  id: string;
  displayName: string;
  email: string | undefined;
  role: UserRole;
  keywords: MailboxAccess["keywords"];
  permissions: string;
};

export const getProfile = cache(
  async (userId: string) => await db.query.userProfiles.findFirst({ where: eq(userProfiles.id, userId) }),
);

export const isAdmin = (profile?: typeof userProfiles.$inferSelect) => profile?.permissions === "admin";

export const addUser = async (
  inviterUserId: string,
  emailAddress: string,
  displayName: string,
  permission?: string,
) => {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.createUser({
    email: emailAddress,
    user_metadata: {
      inviter_user_id: inviterUserId,
      display_name: displayName,
      permissions: permission ?? "member",
    },
  });
  if (error) throw error;
};

export const getUsersWithMailboxAccess = async (): Promise<UserWithMailboxAccessData[]> => {
  const users = await db
    .select({
      id: userProfiles.id,
      email: authUsers.email,
      displayName: userProfiles.displayName,
      permissions: userProfiles.permissions,
      access: userProfiles.access,
    })
    .from(userProfiles)
    .innerJoin(authUsers, eq(userProfiles.id, authUsers.id));

  return users.map((user) => {
    const access = user.access ?? { role: "afk", keywords: [] };
    const permissions = user.permissions ?? "member";

    return {
      id: user.id,
      displayName: user.displayName || "",
      email: user.email ?? undefined,
      role: access.role,
      keywords: access?.keywords ?? [],
      permissions,
    };
  });
};

export const updateUserMailboxData = async (
  userId: string,
  updates: {
    displayName?: string;
    role?: UserRole;
    keywords?: MailboxAccess["keywords"];
  },
): Promise<UserWithMailboxAccessData> => {
  await db
    .update(userProfiles)
    .set({
      displayName: updates.displayName,
      access: {
        role: updates.role || "afk",
        keywords: updates.keywords || [],
      },
    })
    .where(eq(userProfiles.id, userId));

  const [updatedProfile] = await db
    .select({
      id: userProfiles.id,
      displayName: userProfiles.displayName,
      access: userProfiles.access,
      permissions: userProfiles.permissions,
      createdAt: userProfiles.createdAt,
      updatedAt: userProfiles.updatedAt,
      email: authUsers.email,
    })
    .from(userProfiles)
    .innerJoin(authUsers, eq(userProfiles.id, authUsers.id))
    .where(eq(userProfiles.id, userId));

  return {
    id: updatedProfile?.id ?? userId,
    displayName: getFullName(updatedProfile?.displayName, updatedProfile?.email),
    email: updatedProfile?.email ?? undefined,
    role: updatedProfile?.access?.role || "afk",
    keywords: updatedProfile?.access?.keywords || [],
    permissions: updatedProfile?.permissions ?? "",
  };
};

export const findUserViaSlack = cache(async (token: string, slackUserId: string) => {
  const slackUser = await getSlackUser(token, slackUserId);
  return (await db.query.authUsers.findFirst({ where: eq(authUsers.email, slackUser?.profile?.email ?? "") })) ?? null;
});
