import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db/client";
import { userProfiles } from "@/db/schema/userProfiles";
import { authUsers } from "@/db/supabaseSchema/auth";
import { getFullName } from "@/lib/auth/authUtils";
import { createAdminClient } from "@/lib/supabase/server";
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

export const getUsersWithMailboxAccess = async (unused_mailboxId: number): Promise<UserWithMailboxAccessData[]> => {
  const users = await db
    .select({
      id: authUsers.id,
      email: authUsers.email,
      rawMetadata: authUsers.user_metadata,
      displayName: userProfiles.displayName,
      permissions: userProfiles.permissions,
      access: userProfiles.access,
    })
    .from(authUsers)
    .leftJoin(userProfiles, eq(authUsers.id, userProfiles.id));

  return users.map((user) => {
    const access = user.access ?? user.rawMetadata?.mailboxAccess?.[unused_mailboxId] ?? { role: "afk", keywords: [] };
    const permissions = user.permissions ?? "member";

    return {
      id: user.id,
      displayName: user.displayName || user.rawMetadata?.display_name || "",
      email: user.email ?? undefined,
      role: access.role,
      keywords: access?.keywords ?? [],
      permissions,
    };
  });
};

export const updateUserMailboxData = async (
  userId: string,
  unused_mailboxId: number,
  updates: {
    displayName?: string;
    role?: UserRole;
    keywords?: MailboxAccess["keywords"];
  },
): Promise<UserWithMailboxAccessData> => {
  const supabase = createAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.admin.getUserById(userId);
  if (error) throw error;

  const userMetadata = user?.user_metadata || {};
  const mailboxAccess = (userMetadata.mailboxAccess as Record<string, any>) || {};

  // Only update the fields that were provided, keep the rest
  const updatedMailboxData = {
    ...mailboxAccess[unused_mailboxId],
    ...(updates.role && { role: updates.role }),
    ...(updates.keywords && { keywords: updates.keywords }),
    updatedAt: new Date().toISOString(),
  };

  const {
    data: { user: updatedUser },
    error: updateError,
  } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...userMetadata,
      ...(updates.displayName && { display_name: updates.displayName }),
      mailboxAccess: {
        ...mailboxAccess,
        [unused_mailboxId]: updatedMailboxData,
      },
    },
  });
  if (updateError) throw updateError;
  if (!updatedUser) throw new Error("Failed to update user");

  const [updatedProfile] = await db
    .update(userProfiles)
    .set({
      displayName: updates.displayName,
      access: {
        role: updates.role || "afk",
        keywords: updates.keywords || [],
      },
    })
    .where(eq(userProfiles.id, updatedUser.id))
    .returning();

  return {
    id: updatedUser.id,
    displayName: getFullName(updatedUser),
    email: updatedUser.email ?? undefined,
    role: updatedProfile?.access?.role || "afk",
    keywords: updatedProfile?.access?.keywords || [],
    permissions: updatedProfile?.permissions ?? "",
  };
};

export const findUserViaSlack = cache(async (token: string, slackUserId: string) => {
  const slackUser = await getSlackUser(token, slackUserId);
  return (await db.query.authUsers.findFirst({ where: eq(authUsers.email, slackUser?.profile?.email ?? "") })) ?? null;
});
