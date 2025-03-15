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

export const findUserViaSlack = async (organizationId: string, token: string, slackUserId: string) => {
  console.log("findUserViaSlack called with:", { organizationId, slackUserId });

  try {
    console.log("Getting all users from Clerk for organization");
    const allUsers = await getClerkUserList(organizationId);
    console.log(`Found ${allUsers.data.length} users in organization`);

    console.log("Looking for user with matching external Slack account ID");
    const matchingUser = allUsers.data.find((user) =>
      user.externalAccounts.some((account) => account.externalId === slackUserId),
    );

    if (matchingUser) {
      console.log("Found user with matching external Slack account:", matchingUser.id);
      return matchingUser;
    }

    console.log("No user found with matching external account, trying to match by email");
    console.log("Getting Slack user info");
    const slackUser = await getSlackUser(token, slackUserId);
    console.log("Slack user info:", slackUser?.profile?.email ? { email: slackUser.profile.email } : "No email found");

    if (!slackUser?.profile?.email) {
      console.log("No email found in Slack user profile");
      return null;
    }

    const userByEmail = allUsers.data.find((user) =>
      user.emailAddresses.some((address) => address.emailAddress === slackUser?.profile?.email),
    );

    if (userByEmail) {
      console.log("Found user with matching email:", userByEmail.id);
    } else {
      console.log("No user found with matching email");
    }

    return userByEmail ?? null;
  } catch (error) {
    console.error("Error in findUserViaSlack:", error);
    return null;
  }
};

export const getOAuthAccessToken = async (clerkUserId: string, provider: "oauth_google" | "oauth_slack") => {
  const tokens = await clerkClient.users.getUserOauthAccessToken(clerkUserId, provider);
  return tokens.data[0]?.token;
};

export const setPrivateMetadata = async (user: User, metadata: UserPrivateMetadata) => {
  await clerkClient.users.updateUserMetadata(user.id, { privateMetadata: metadata });
};
