"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { subscriptions } from "@/db/schema";
import {
  cancelStripeSubscription,
  createStripeCheckoutSessionUrl,
  createStripeCustomerPortalUrl,
  createStripeSubscription,
} from "@/lib/data/subscription";
import { stripe } from "@/lib/stripe/client";
import { mailboxProcedureAction } from "@/trpc/serverActions";

export async function handleSuccessfulSubscription(session_id: string): Promise<{ success: boolean; message: string }> {
  const error_message = "Payment cannot be verified at the moment, please check after 10 minutes.";

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const isPaid = session.payment_status === "paid";
    if (isPaid) await createStripeSubscription(session);
    return {
      success: isPaid,
      message: isPaid ? "Successfully subscribed to Helper" : error_message,
    };
  } catch (error) {
    console.error("Error retrieving Stripe session:", error);
    return {
      success: false,
      message: error_message,
    };
  }
}

export const subscribeToHelper = mailboxProcedureAction.mutation(async ({ ctx }) => {
  const stripeCheckoutSessionUrl = await createStripeCheckoutSessionUrl({
    gmailSupportEmailId: ctx.mailbox.gmailSupportEmailId,
    slug: ctx.mailbox.slug,
    clerkOrganizationId: ctx.mailbox.clerkOrganizationId,
  });
  if (stripeCheckoutSessionUrl) return redirect(stripeCheckoutSessionUrl);
  throw new Error("Failed to create Stripe session");
});

export const unsubscribeFromHelper = mailboxProcedureAction.mutation(async ({ ctx }) => {
  const { success, message } = await cancelStripeSubscription(ctx.mailbox.clerkOrganizationId);
  return { success, message };
});

export const manageSubscriptionInStripe = mailboxProcedureAction.mutation(async ({ ctx }) => {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.clerkOrganizationId, ctx.mailbox.clerkOrganizationId),
    columns: {
      stripeCustomerId: true,
    },
  });

  if (!subscription?.stripeCustomerId) {
    throw new Error("No active subscription found");
  }

  const portalUrl = await createStripeCustomerPortalUrl(subscription.stripeCustomerId);
  if (portalUrl) return redirect(portalUrl);
  throw new Error("Failed to create Stripe portal session");
});

export const getSubscriptionDetails = mailboxProcedureAction.query(async ({ ctx }) => {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.clerkOrganizationId, ctx.mailbox.clerkOrganizationId),
    columns: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  if (!subscription?.stripeCustomerId || !subscription?.stripeSubscriptionId) {
    throw new Error("No active subscription found");
  }

  const upcomingInvoice = await stripe.invoices.retrieveUpcoming({ customer: subscription.stripeCustomerId });
  const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

  const planName = stripeSubscription.items.data[0]?.price.nickname || "Helper Plan";
  const aiResolutions = upcomingInvoice.lines.data[0]?.quantity || 0;
  const nextBillingDate = new Date(stripeSubscription.current_period_end * 1000).toLocaleDateString();

  return {
    planName,
    aiResolutions,
    nextBillingDate,
  };
});
