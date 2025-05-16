import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { authIdentities, authUsers } from "@/db/supabaseSchema/auth";
import { getFullName } from "@/lib/auth/authUtils";
import { createClient } from "@/lib/supabase/server";
import { getSlackUser } from "../slack/client";

export const createInvitation = async (inviterUserId: string, emailAddress: string) => {
  const supabase = await createClient();
  return await supabase.auth.admin.inviteUserByEmail(emailAddress, {
    data: {
      inviter_user_id: inviterUserId,
    },
  });
};

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

export const getUsersWithMailboxAccess = async (mailboxId: number): Promise<UserWithMailboxAccessData[]> => {
  const users = await db.query.authUsers.findMany();

  return users.map((user) => {
    const metadata = user.user_metadata || {};
    const mailboxAccess = (metadata.mailboxAccess as Record<string, any>) || {};
    const access = mailboxAccess[mailboxId];

    return {
      id: user.id,
      displayName: user.user_metadata?.name ?? user.id,
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
    role?: UserRole;
    keywords?: MailboxAccess["keywords"];
  },
): Promise<UserWithMailboxAccessData> => {
  const user = await db.query.authUsers.findFirst({ where: eq(authUsers.id, userId) });

  const userMetadata = user?.user_metadata || {};
  const mailboxAccess = (userMetadata.mailboxAccess as Record<string, any>) || {};

  // Only update the fields that were provided, keep the rest
  const updatedMailboxData = {
    ...mailboxAccess[mailboxId],
    ...(updates.role && { role: updates.role }),
    ...(updates.keywords && { keywords: updates.keywords }),
    updatedAt: new Date().toISOString(),
  };

  const updatedUser = await db
    .update(authUsers)
    .set({
      user_metadata: {
        ...userMetadata,
        mailboxAccess: {
          ...mailboxAccess,
          [mailboxId]: updatedMailboxData,
        },
      },
    })
    .returning()
    .then(takeUniqueOrThrow);

  return {
    id: updatedUser.id,
    displayName: getFullName(updatedUser),
    email: updatedUser.email ?? undefined,
    role: updatedMailboxData.role || "afk",
    keywords: updatedMailboxData.keywords || [],
  };
};

export const findUserViaSlack = cache(async (token: string, slackUserId: string) => {
  const linkedAccount = await db.query.authIdentities.findFirst({
    where: and(eq(authIdentities.provider, "slack_oidc"), eq(authIdentities.provider_id, slackUserId)),
  });
  if (linkedAccount) {
    return (await db.query.authUsers.findFirst({ where: eq(authUsers.id, linkedAccount.user_id) })) ?? null;
  }
  const slackUser = await getSlackUser(token, slackUserId);
  return (await db.query.authUsers.findFirst({ where: eq(authUsers.email, slackUser?.profile?.email ?? "") })) ?? null;
});
