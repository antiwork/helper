import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { platformCustomers } from "@/db/schema";
import { getMailbox } from "./mailbox";

type CustomerMetadata = {
  name?: string | null;
  value?: number | null;
  links?: Record<string, string> | null;
  context?: string | null;
};

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
  customerMetadata,
}: {
  email: string;
  customerMetadata: CustomerMetadata;
}) => {
  if (!customerMetadata) return;

  const data: Record<string, unknown> = {};

  if ("name" in customerMetadata) data.name = customerMetadata.name;
  if ("value" in customerMetadata) data.value = customerMetadata.value ?? null;
  if ("links" in customerMetadata) data.links = customerMetadata.links;
  if ("context" in customerMetadata) data.context = customerMetadata.context;

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
