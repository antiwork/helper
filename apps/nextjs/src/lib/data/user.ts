import { ClerkClient, createClerkClient, User } from "@clerk/backend";
import { env } from "@/env";
import { getSlackUser } from "../slack/client";

export const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

export async function benchmarkApiCall<T>(apiCallFn: () => Promise<T>, thresholdMs = 3000): Promise<T> {
  const startTime = performance.now();
  try {
    return await apiCallFn();
  } finally {
    const duration = performance.now() - startTime;
    if (duration > thresholdMs) {
      console.warn(`Clerk API call took ${duration.toFixed(2)}ms, which exceeds the ${thresholdMs}ms threshold`);
    }
  }
}

export const getClerkUser = (userId: string | null) =>
  userId ? benchmarkApiCall(() => clerkClient.users.getUser(userId)) : null;

export const getClerkUserList = (
  organizationId: string,
  { limit = 100, ...params }: NonNullable<Parameters<ClerkClient["users"]["getUserList"]>[0]> = {},
) => benchmarkApiCall(() => clerkClient.users.getUserList({ limit, ...params, organizationId: [organizationId] }));

export const findUserByEmail = async (organizationId: string, email: string) => {
  const { data } = await benchmarkApiCall(() =>
    clerkClient.users.getUserList({ organizationId: [organizationId], emailAddress: [email] }),
  );
  return data[0] ?? null;
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
  const tokens = await benchmarkApiCall(() => clerkClient.users.getUserOauthAccessToken(clerkUserId, provider));
  return tokens.data[0]?.token;
};

export const setPrivateMetadata = async (user: User, metadata: UserPrivateMetadata) => {
  await benchmarkApiCall(() => clerkClient.users.updateUserMetadata(user.id, { privateMetadata: metadata }));
};
