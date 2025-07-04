import { eq, and } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db/client";
import { userProfiles } from "@/db/schema/userProfiles";
import { userMailboxAccess } from "@/db/schema/userMailboxAccess";
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
  const { data: userData, error } = await supabase.auth.admin.createUser({
    email: emailAddress,
  });
  if (error) throw error;
  
  if (userData.user) {
    await db.insert(userProfiles).values({
      id: userData.user.id,
      displayName: displayName,
      permissions: permission ?? "member",
      inviterUserId,
    }).onConflictDoUpdate({
      target: userProfiles.id,
      set: {
        displayName: displayName,
        permissions: permission ?? "member",
        inviterUserId,
      },
    });
  }
};

export const getUsersWithMailboxAccess = async (mailboxId: number): Promise<UserWithMailboxAccessData[]> => {
  const users = await db
    .select({
      id: authUsers.id,
      email: authUsers.email,
      rawMetadata: authUsers.user_metadata,
      displayName: userProfiles.displayName,
      permissions: userProfiles.permissions,
      mailboxRole: userMailboxAccess.role,
      mailboxKeywords: userMailboxAccess.keywords,
    })
    .from(authUsers)
    .leftJoin(userProfiles, eq(authUsers.id, userProfiles.id))
    .leftJoin(userMailboxAccess, and(eq(userMailboxAccess.userId, authUsers.id), eq(userMailboxAccess.mailboxId, mailboxId)));

  return users.map((user) => {
    const role = user.mailboxRole ?? user.rawMetadata?.mailboxAccess?.[mailboxId]?.role ?? "afk";
    const keywords = user.mailboxKeywords ?? user.rawMetadata?.mailboxAccess?.[mailboxId]?.keywords ?? [];
    const permissions = user.permissions ?? "member";

    return {
      id: user.id,
      displayName: user.displayName || user.rawMetadata?.display_name || "",
      email: user.email ?? undefined,
      role: role as UserRole,
      keywords: keywords,
      permissions,
    };
  });
};

export const updateUserMailboxData = async (
  userId: string,
  mailboxId: number,
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
  if (!user) throw new Error("User not found");

  const userMetadata = user.user_metadata || {};
  const mailboxAccess = (userMetadata.mailboxAccess as Record<string, any>) || {};

  // Only update the fields that were provided, keep the rest
  const updatedMailboxData = {
    ...mailboxAccess[mailboxId],
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
        [mailboxId]: updatedMailboxData,
      },
    },
  });
  if (updateError) throw updateError;
  if (!updatedUser) throw new Error("Failed to update user");

  let profile;
  if (updates.displayName) {
    [profile] = await db.update(userProfiles)
    .set({ displayName: updates.displayName })
    .where(eq(userProfiles.id, updatedUser.id))
    .returning();
  } else {
    profile = await db.query.userProfiles.findFirst({ where: eq(userProfiles.id, updatedUser.id) });
  }

  if (updates.role || updates.keywords) {
    await db
      .insert(userMailboxAccess)
      .values({
        userId: updatedUser.id,
        mailboxId,
        role: updates.role || "afk",
        keywords: updates.keywords || [],
      })
      .onConflictDoUpdate({
        target: [userMailboxAccess.userId, userMailboxAccess.mailboxId],
        set: {
          ...(updates.role && { role: updates.role }),
          ...(updates.keywords && { keywords: updates.keywords }),
          updatedAt: new Date(),
        },
      });
  }

  const mailboxAccessRow = await db.query.userMailboxAccess.findFirst({
    where: and(eq(userMailboxAccess.userId, updatedUser.id), eq(userMailboxAccess.mailboxId, mailboxId)),
  });

  return {
    id: updatedUser.id,
    displayName: getFullName(updatedUser),
    email: updatedUser.email ?? undefined,
    role: mailboxAccessRow?.role || "afk",
    keywords: mailboxAccessRow?.keywords || [],
    permissions: profile?.permissions ?? "member",
  };
};

export const findUserViaSlack = cache(async (token: string, slackUserId: string) => {
  const slackUser = await getSlackUser(token, slackUserId);
  return (await db.query.authUsers.findFirst({ where: eq(authUsers.email, slackUser?.profile?.email ?? "") })) ?? null;
});
