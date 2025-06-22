import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db/client";
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
};

export const addUser = async (inviterUserId: string, emailAddress: string, displayName: string) => {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.createUser({
    email: emailAddress,
    user_metadata: {
      inviter_user_id: inviterUserId,
      display_name: displayName,
    },
  });
  if (error) throw error;
};

export const getUsersWithMailboxAccess = async (mailboxId: number): Promise<UserWithMailboxAccessData[]> => {
  const users = await db.query.authUsers.findMany();

  return users.map((user) => {
    const metadata = user.user_metadata || {};
    const mailboxAccess = (metadata.mailboxAccess as Record<string, any>) || {};
    const access = mailboxAccess[mailboxId];

    return {
      id: user.id,
      displayName: user.user_metadata?.display_name ?? null,
      email: user.email ?? undefined,
      role: access?.role || "afk",
      keywords: access?.keywords || [],
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

  const userMetadata = user?.user_metadata || {};
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

  return {
    id: updatedUser.id,
    displayName: getFullName(updatedUser),
    email: updatedUser.email ?? undefined,
    role: updatedMailboxData.role || "afk",
    keywords: updatedMailboxData.keywords || [],
  };
};

export const findUserViaSlack = cache(async (token: string, slackUserId: string) => {
  const slackUser = await getSlackUser(token, slackUserId);
  return (await db.query.authUsers.findFirst({ where: eq(authUsers.email, slackUser?.profile?.email ?? "") })) ?? null;
});
