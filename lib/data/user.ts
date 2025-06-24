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

export const addMember = async (
  inviterUserId: string,
  emailAddress: string,
  displayName: string,
  mailboxId: number,
  role: "core" | "nonCore" | "afk" = "afk",
) => {
  const supabase = createAdminClient();

  const { data: existingUsers, error: fetchError } = await supabase.auth.admin.listUsers();

  if (fetchError) throw fetchError;

  const existingUser = existingUsers?.users?.find((user) => user.email?.toLowerCase() === emailAddress.toLowerCase());

  if (existingUser) {
    const existingMetadata = existingUser.user_metadata || {};
    const existingMailboxAccess = existingMetadata.mailboxAccess || {};

    const updatedMailboxAccess = {
      ...existingMailboxAccess,
      [mailboxId]: {
        role,
        keywords: [],
        updatedAt: new Date().toISOString(),
      },
    };

    const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      user_metadata: {
        ...existingMetadata,
        display_name: displayName || existingMetadata.display_name,
        mailboxAccess: updatedMailboxAccess,
      },
    });

    if (updateError) throw updateError;
  } else {
    const { error: createError } = await supabase.auth.admin.createUser({
      email: emailAddress,
      user_metadata: {
        inviter_user_id: inviterUserId,
        display_name: displayName,
        mailboxAccess: {
          [mailboxId]: {
            role,
            keywords: [],
            updatedAt: new Date().toISOString(),
          },
        },
      },
    });

    if (createError) throw createError;
  }
};

export const removeMailboxAccess = async (id: string, mailboxId: number) => {
  const user = await db.query.authUsers.findFirst({
    where: eq(authUsers.id, id),
  });

  if (!user) throw new Error("User not found");

  const mailboxAccess = (user.user_metadata?.mailboxAccess ?? {}) as Record<string, any>;

  delete mailboxAccess[mailboxId];

  await db
    .update(authUsers)
    .set({
      user_metadata: {
        ...user.user_metadata,
        mailboxAccess,
      },
    })
    .where(eq(authUsers.id, id));
};

export const getUsersWithMailboxAccess = async (mailboxId: number): Promise<UserWithMailboxAccessData[]> => {
  const users = await db.query.authUsers.findMany();

  return users
    .filter((user) => {
      const mailboxAccess = (user.user_metadata?.mailboxAccess ?? {}) as Record<string, any>;
      return mailboxAccess[mailboxId];
    })
    .map((user) => {
      const mailboxAccess = (user.user_metadata?.mailboxAccess ?? {}) as Record<string, any>;
      const access = mailboxAccess[mailboxId];

      return {
        id: user.id,
        displayName: user.user_metadata?.display_name || "",
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
