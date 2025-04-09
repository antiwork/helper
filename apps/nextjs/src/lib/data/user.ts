import { ClerkClient, createClerkClient, User } from "@clerk/backend";
import { cache } from "react";
import { env } from "@/env";
import { getSlackUser } from "../slack/client";

export const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

export const getClerkUser = cache((userId: string | null) => (userId ? clerkClient.users.getUser(userId) : null));

export const getClerkUserList = cache(
  (
    organizationId: string,
    { limit = 100, ...params }: NonNullable<Parameters<ClerkClient["users"]["getUserList"]>[0]> = {},
  ) => clerkClient.users.getUserList({ limit, ...params, organizationId: [organizationId] }),
);

export const findUserByEmail = cache(async (organizationId: string, email: string) => {
  const { data } = await clerkClient.users.getUserList({ organizationId: [organizationId], emailAddress: [email] });
  return data[0] ?? null;
});

export const findUserViaSlack = cache(async (organizationId: string, token: string, slackUserId: string) => {
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
