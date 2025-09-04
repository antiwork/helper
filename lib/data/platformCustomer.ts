import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { platformCustomers } from "@/db/schema";
import { CustomerInfo } from "@/lib/metadataApiClient";
import { getMailbox } from "./mailbox";

export type PlatformCustomer = typeof platformCustomers.$inferSelect & {
  isVip: boolean;
};

export const determineVipStatus = (customerValue: string | number | null, vipThreshold: number | null) => {
  if (!customerValue || !vipThreshold) return false;
  return Number(customerValue) / 100 >= vipThreshold;
};

export const getPlatformCustomer = async (email: string): Promise<PlatformCustomer | null> => {
  const [customer, mailbox] = await Promise.all([
    db.query.platformCustomers.findFirst({
      where: and(eq(platformCustomers.email, email)),
    }),
    getMailbox(),
  ]);

  if (!customer) return null;

  return {
    ...customer,
    isVip: determineVipStatus(customer.value as number | null, mailbox?.vipThreshold ?? null),
  };
};

export const upsertPlatformCustomer = async ({
  email,
  customerInfo,
}: {
  email: string;
  // `links` is deprecated, use `actions` instead
  customerInfo: CustomerInfo & { links?: Record<string, string> | null };
}) => {
  if (!customerInfo) return;

  const data: Record<string, unknown> = {};

  if ("name" in customerInfo) data.name = customerInfo.name;
  if ("value" in customerInfo) data.value = customerInfo.value ?? null;
  if ("links" in customerInfo) data.links = customerInfo.links;
  if ("actions" in customerInfo) data.links = customerInfo.actions;
  if ("metadata" in customerInfo) data.metadata = customerInfo.metadata;

  if (Object.keys(data).length === 0) return;

  await db
    .insert(platformCustomers)
    .values({
      email,
      ...data,
    })
    .onConflictDoUpdate({
      target: platformCustomers.email,
      set: data,
    });
};

export const findOrCreatePlatformCustomerByEmail = async (email: string): Promise<PlatformCustomer | null> => {
  const existingCustomer = await getPlatformCustomer(email);
  if (existingCustomer) return existingCustomer;

  const [result, mailbox] = await Promise.all([
    db
      .insert(platformCustomers)
      .values({
        email,
      })
      .returning(),
    getMailbox(),
  ]);

  const customer = result[0];
  if (!customer) return null;

  return {
    ...customer,
    isVip: determineVipStatus(customer.value as number | null, mailbox?.vipThreshold ?? null),
  };
};
