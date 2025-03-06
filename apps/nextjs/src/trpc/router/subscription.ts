import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { subscriptions } from "@/db/schema";
import {
  cancelStripeSubscription,
  createStripeCheckoutSessionUrl,
  createStripeCustomerPortalUrl,
  createStripeSubscription,
} from "@/lib/data/subscription";
import { captureExceptionAndThrowIfDevelopment } from "@/lib/shared/sentry";
import { stripe } from "@/lib/stripe/client";
import { mailboxProcedure } from "./mailbox/procedure";

export const subscriptionRouter = {
  startCheckout: mailboxProcedure.mutation(async ({ ctx }) => {
    const stripeCheckoutSessionUrl = await createStripeCheckoutSessionUrl({
      gmailSupportEmailId: ctx.mailbox.gmailSupportEmailId,
      slug: ctx.mailbox.slug,
      clerkOrganizationId: ctx.mailbox.clerkOrganizationId,
    });
    if (stripeCheckoutSessionUrl) return { url: stripeCheckoutSessionUrl };
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create Stripe session" });
  }),

  subscribe: mailboxProcedure.input(z.object({ sessionId: z.string() })).mutation(async ({ input }) => {
    const errorMessage = "Payment cannot be verified at the moment, please check after 10 minutes.";

    try {
      const session = await stripe.checkout.sessions.retrieve(input.sessionId);
      const isPaid = session.payment_status === "paid";
      if (isPaid) await createStripeSubscription(session);
      return {
        success: isPaid,
        message: isPaid ? "Successfully subscribed to Helper" : errorMessage,
      };
    } catch (error) {
      captureExceptionAndThrowIfDevelopment(error);
      return {
        success: false,
        message: errorMessage,
      };
    }
  }),

  unsubscribe: mailboxProcedure.mutation(async ({ ctx }) => {
    const { success, message } = await cancelStripeSubscription(ctx.mailbox.clerkOrganizationId);
    return { success, message };
  }),

  manage: mailboxProcedure.mutation(async ({ ctx }) => {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.clerkOrganizationId, ctx.mailbox.clerkOrganizationId),
      columns: {
        stripeCustomerId: true,
      },
    });

    if (!subscription?.stripeCustomerId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No active subscription found" });
    }

    const portalUrl = await createStripeCustomerPortalUrl(subscription.stripeCustomerId);
    if (portalUrl) return { url: portalUrl };
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create Stripe portal session" });
  }),

  get: mailboxProcedure.query(async ({ ctx }) => {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.clerkOrganizationId, ctx.mailbox.clerkOrganizationId),
      columns: {
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!subscription?.stripeCustomerId || !subscription?.stripeSubscriptionId) {
      return null;
    }

    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({ customer: subscription.stripeCustomerId });
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

    const planName = stripeSubscription.items.data[0]?.price.nickname || "Helper Plan";
    const aiResolutions = upcomingInvoice.lines.data[0]?.quantity || 0;
    const nextBillingDate = new Date(stripeSubscription.current_period_end * 1000);

    return {
      planName,
      aiResolutions,
      nextBillingDate,
    };
  }),
} satisfies TRPCRouterRecord;
