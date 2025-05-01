import { Organization, OrganizationMembership, User } from "@clerk/nextjs/server";
import { addDays } from "date-fns";
import { desc, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db/client";
import { subscriptions } from "@/db/schema";
import { FREE_TRIAL_PERIOD_DAYS } from "@/lib/auth/account";
import { env } from "@/lib/env";
import { redis } from "@/lib/redis/client";
import { clerkClient, getClerkUserList } from "./user";

export const ADDITIONAL_PAID_ORGANIZATION_IDS = env.ADDITIONAL_PAID_ORGANIZATION_IDS?.split(",") ?? [];

export const getClerkOrganization = cache(async (organizationId: string) => {
  return await clerkClient.organizations.getOrganization({ organizationId });
});

export const addMember = async (organizationId: string, userId: string) => {
  return await clerkClient.organizations.createOrganizationMembership({ organizationId, userId, role: "org:member" });
};

export const setPrivateMetadata = async (organizationId: string, metadata: Record<string, any>) => {
  return await clerkClient.organizations.updateOrganizationMetadata(organizationId, { privateMetadata: metadata });
};

export const getOrganizationMembers = cache(
  async (organizationId: string, limit = 100): Promise<{ data: OrganizationMembership[] }> => {
    return await clerkClient.organizations.getOrganizationMembershipList({ organizationId, limit });
  },
);

export const getOrganizationAdminUsers = async (organizationId: string) => {
  const members = await getOrganizationMembers(organizationId);
  const admins = await getClerkUserList(organizationId, {
    userId: members.data
      .filter((member) => member.role === "org:admin")
      .flatMap((member) => member.publicUserData?.userId ?? []),
  });
  return admins.data;
};

export const getOrganizationMemberships = async (userId: string): Promise<{ data: OrganizationMembership[] }> => {
  return await clerkClient.users.getOrganizationMembershipList({ userId });
};

export const createOrganization = async (user: User) => {
  return await clerkClient.organizations.createOrganization({
    name: user.firstName ? `${user.firstName}'s Organization` : "My Organization",
    createdBy: user.id,
    privateMetadata: {
      freeTrialEndsAt: addDays(new Date(), FREE_TRIAL_PERIOD_DAYS).toISOString(),
      automatedRepliesCount: 0,
    },
  });
};

export type SubscriptionStatus = "paid" | "free_trial" | "free_trial_expired";

export const getSubscriptionStatus = async (organization: Organization): Promise<SubscriptionStatus> => {
  if (!env.STRIPE_PRICE_ID || ADDITIONAL_PAID_ORGANIZATION_IDS.includes(organization.id)) {
    return "paid";
  }

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.clerkOrganizationId, organization.id),
    orderBy: desc(subscriptions.createdAt),
  });

  if (subscription) {
    return "paid";
  } else if (isFreeTrial(organization)) {
    return "free_trial";
  }
  return "free_trial_expired";
};

export const getCachedSubscriptionStatus = async (organizationId: string): Promise<SubscriptionStatus> => {
  const cacheKey = `subscription-status:${organizationId}`;
  const cached: SubscriptionStatus | null = await redis.get(cacheKey);
  if (cached) return cached;

  const organization = await getClerkOrganization(organizationId);
  const status = await getSubscriptionStatus(organization);
  await redis.set(cacheKey, status, { ex: 60 * 60 });
  return status;
};

export const isFreeTrial = (organization: Organization): boolean =>
  !!organization.privateMetadata.freeTrialEndsAt && new Date(organization.privateMetadata.freeTrialEndsAt) > new Date();
