import { ClerkClient, createClerkClient, User } from "@clerk/backend";
import { env } from "@/env";
import { getSlackUser } from "../slack/client";

export const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

export const getClerkUser = (userId: string | null) => (userId ? clerkClient.users.getUser(userId) : null);

export const getClerkUserList = (
  organizationId: string,
  { limit = 100, ...params }: NonNullable<Parameters<ClerkClient["users"]["getUserList"]>[0]> = {},
) => clerkClient.users.getUserList({ limit, ...params, organizationId: [organizationId] });

export const findUserByEmail = async (organizationId: string, email: string) => {
  const { data } = await clerkClient.users.getUserList({ organizationId: [organizationId], emailAddress: [email] });
  return data[0] ?? null;
};

export const createOrganizationInvitation = async (
  organizationId: string,
  inviterUserId: string,
  emailAddress: string,
  role = "org:member",
) => {
  return await clerkClient.organizations.createOrganizationInvitation({
    organizationId,
    inviterUserId,
    emailAddress,
    role,
  });
};

export type UserRole = "core" | "nonCore" | "afk";

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

export const getUsersWithMailboxAccess = async (
  organizationId: string,
  mailboxId: number,
): Promise<UserWithMailboxAccessData[]> => {
  const users = await getClerkUserList(organizationId);

  return users.data.map((user) => {
    const metadata = user.publicMetadata || {};
    const mailboxAccess = (metadata.mailboxAccess as Record<string, any>) || {};
    const access = mailboxAccess[mailboxId];

    return {
      id: user.id,
      displayName: user.fullName ?? user.id,
      email: user.emailAddresses[0]?.emailAddress,
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
  const user = await clerkClient.users.getUser(userId);

  const publicMetadata = user.publicMetadata || {};
  const mailboxAccess = (publicMetadata.mailboxAccess as Record<string, any>) || {};

  // Only update the fields that were provided, keep the rest
  const updatedMailboxData = {
    ...mailboxAccess[mailboxId],
    ...(updates.role && { role: updates.role }),
    ...(updates.keywords && { keywords: updates.keywords }),
    updatedAt: new Date().toISOString(),
  };

  const updatedUser = await clerkClient.users.updateUser(userId, {
    publicMetadata: {
      ...publicMetadata,
      mailboxAccess: {
        ...mailboxAccess,
        [mailboxId]: updatedMailboxData,
      },
    },
  });

  return {
    id: updatedUser.id,
    displayName: updatedUser.fullName ?? updatedUser.id,
    email: updatedUser.emailAddresses[0]?.emailAddress,
    role: updatedMailboxData.role || "afk",
    keywords: updatedMailboxData.keywords || [],
  };
};

export const findUserViaSlack = async (organizationId: string, token: string, slackUserId: string) => {
  const allUsers = await getClerkUserList(organizationId);

  const matchingUser = allUsers.data.find((user) =>
    user.externalAccounts.some((account) => account.externalId === slackUserId),
  );
  if (matchingUser) return matchingUser;

  const slackUser = await getSlackUser(token, slackUserId);
  return (
    allUsers.data.find((user) =>
      user.emailAddresses.some((address) => address.emailAddress === slackUser?.profile?.email),
    ) ?? null
  );
};

export const getOAuthAccessToken = async (clerkUserId: string, provider: "oauth_google" | "oauth_slack") => {
  const tokens = await clerkClient.users.getUserOauthAccessToken(clerkUserId, provider);
  return tokens.data[0]?.token;
};

export const setPrivateMetadata = async (user: User, metadata: UserPrivateMetadata) => {
  await clerkClient.users.updateUserMetadata(user.id, { privateMetadata: metadata });
};
