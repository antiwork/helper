import { gmailSupportEmailFactory } from "@tests/support/factories/gmailSupportEmails";
import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { subscriptionFactory } from "@tests/support/factories/subscriptions";
import { userFactory } from "@tests/support/factories/users";
import dayjs from "dayjs";
import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { handleStripeEvent } from "@/inngest/functions/handleStripeWebhookEvent";
import { getGmailService, subscribeToMailbox } from "@/lib/gmail/client";
import { stripe } from "@/lib/stripe/client";

vi.mock("@/lib/gmail/client");
vi.mock("@/lib/stripe/client");

describe("handleStripeEvent", () => {
  describe("checkout.session.completed", () => {
    it("handles new subscriptions", async () => {
      const { organization } = await userFactory.createRootUser();
      const checkoutSession: Stripe.Checkout.Session = {
        id: "cs_test_123",
        object: "checkout.session",
        client_reference_id: organization.id.toString(),
        subscription: "sub_123",
        customer: "cus_123",
        mode: "subscription",
      } as Stripe.Checkout.Session;

      const event: Stripe.Event = {
        type: "checkout.session.completed",
        data: { object: checkoutSession },
      } as Stripe.Event;

      stripe!.subscriptions.retrieve = vi.fn().mockResolvedValue({
        id: "sub_123",
        status: "active",
        current_period_end: dayjs().add(1, "day").unix(),
        canceled_at: null,
        customer: "cus_123",
      });

      await handleStripeEvent(event);

      const createdSubscription = await db.query.subscriptions.findFirst({
        where: (s, { eq }) => eq(s.clerkOrganizationId, organization.id),
      });

      expect(createdSubscription).toMatchObject({
        clerkOrganizationId: organization.id,
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        status: "active",
        currentPeriodEnd: expect.any(Date),
        canceledAt: null,
      });
    });

    it("handles existing subscriptions", async () => {
      const { organization } = await userFactory.createRootUser();
      await subscriptionFactory.create(organization.id, {
        canceledAt: new Date(),
      });
      const checkoutSession: Stripe.Checkout.Session = {
        id: "id_new",
        object: "checkout.session",
        client_reference_id: organization.id.toString(),
        subscription: "sub_new",
        customer: "cus_new",
        mode: "subscription",
      } as Stripe.Checkout.Session;

      const event: Stripe.Event = {
        type: "checkout.session.completed",
        data: { object: checkoutSession },
      } as Stripe.Event;

      stripe!.subscriptions.retrieve = vi.fn().mockResolvedValue({
        id: "sub_new",
        status: "active",
        current_period_end: dayjs().add(1, "day").unix(),
        canceled_at: null,
        customer: "cus_new",
      });

      await handleStripeEvent(event);

      const updatedSubscription = await db.query.subscriptions.findFirst({
        where: (s, { eq }) => eq(s.clerkOrganizationId, organization.id),
      });

      expect(updatedSubscription).toMatchObject({
        clerkOrganizationId: organization.id,
        stripeCustomerId: "cus_new",
        stripeSubscriptionId: "sub_new",
        status: "active",
        currentPeriodEnd: expect.any(Date),
        canceledAt: null,
      });
    });
  });

  it("handles the customer.subscription.updated event", async () => {
    const { organization } = await userFactory.createRootUser();
    const { subscription } = await subscriptionFactory.create(organization.id);

    const updatedStripeSubscription: Stripe.Subscription = {
      id: subscription.stripeSubscriptionId,
      status: "past_due",
      current_period_end: dayjs().add(1, "day").unix(),
      canceled_at: null,
    } as Stripe.Subscription;

    const event: Stripe.Event = {
      type: "customer.subscription.updated",
      data: { object: updatedStripeSubscription },
    } as Stripe.Event;

    await handleStripeEvent(event);

    const updatedSubscription = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.id, subscription.id),
    });

    expect(updatedSubscription).toMatchObject({
      status: "past_due",
      currentPeriodEnd: expect.any(Date),
      canceledAt: null,
    });
  });

  it("handles the customer.subscription.deleted event", async () => {
    const { organization } = await userFactory.createRootUser();
    const { subscription } = await subscriptionFactory.create(organization.id);

    const deletedStripeSubscription: Stripe.Subscription = {
      id: subscription.stripeSubscriptionId,
      status: "canceled",
      current_period_end: Math.floor(Date.now() / 1000),
      canceled_at: Math.floor(Date.now() / 1000),
    } as Stripe.Subscription;

    const event: Stripe.Event = {
      type: "customer.subscription.deleted",
      data: { object: deletedStripeSubscription },
    } as Stripe.Event;

    await handleStripeEvent(event);

    const updatedSubscription = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.id, subscription.id),
    });

    expect(updatedSubscription).toMatchObject({
      status: "canceled",
      currentPeriodEnd: expect.any(Date),
      canceledAt: expect.any(Date),
    });
  });

  it("handles the invoice.payment_succeeded event", async () => {
    const { organization } = await userFactory.createRootUser();
    const { subscription } = await subscriptionFactory.create(organization.id, { status: "past_due" });

    const invoice: Stripe.Invoice = {
      id: "in_123",
      subscription: subscription.stripeSubscriptionId,
      status: "paid",
    } as Stripe.Invoice;

    const event: Stripe.Event = {
      type: "invoice.payment_succeeded",
      data: { object: invoice },
    } as Stripe.Event;

    stripe!.subscriptions.retrieve = vi.fn().mockResolvedValue({
      id: subscription.stripeSubscriptionId,
      status: "active",
      current_period_end: dayjs().add(1, "day").unix(),
      canceled_at: null,
    });

    await handleStripeEvent(event);

    const updatedSubscription = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.id, subscription.id),
    });

    expect(updatedSubscription).toMatchObject({
      status: "active",
      currentPeriodEnd: expect.any(Date),
      canceledAt: null,
    });
  });

  it("handles the invoice.payment_failed event", async () => {
    const { organization } = await userFactory.createRootUser();
    const { subscription } = await subscriptionFactory.create(organization.id, { status: "active" });

    const invoice: Stripe.Invoice = {
      id: "in_123",
      subscription: subscription.stripeSubscriptionId,
      status: "open",
    } as Stripe.Invoice;

    const event: Stripe.Event = {
      type: "invoice.payment_failed",
      data: { object: invoice },
    } as Stripe.Event;

    stripe!.subscriptions.retrieve = vi.fn().mockResolvedValue({
      id: subscription.stripeSubscriptionId,
      status: "past_due",
      current_period_end: dayjs().add(1, "day").unix(),
      canceled_at: null,
    });

    await handleStripeEvent(event);

    const updatedSubscription = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.id, subscription.id),
    });

    expect(updatedSubscription).toMatchObject({
      status: "past_due",
      currentPeriodEnd: expect.any(Date),
      canceledAt: null,
    });
  });

  it("renews all Gmail mailbox watches for an organization if the subscription status is active", async () => {
    const { gmailSupportEmail } = await gmailSupportEmailFactory.create({
      accessToken: "mock_access_token1",
      refreshToken: "mock_refresh_token1",
    });
    const { gmailSupportEmail: gmailSupportEmail2 } = await gmailSupportEmailFactory.create({
      accessToken: "mock_access_token2",
      refreshToken: "mock_refresh_token2",
    });

    const { organization } = await userFactory.createRootUser({
      mailboxOverrides: { gmailSupportEmailId: gmailSupportEmail.id },
    });
    await mailboxFactory.create(organization.id, {
      gmailSupportEmailId: gmailSupportEmail2.id,
    });
    const { subscription } = await subscriptionFactory.create(organization.id);

    const updatedStripeSubscription: Stripe.Subscription = {
      id: subscription.stripeSubscriptionId,
      status: "active",
      current_period_end: dayjs().add(30, "day").unix(),
      canceled_at: null,
    } as Stripe.Subscription;

    const event: Stripe.Event = {
      type: "customer.subscription.updated",
      data: { object: updatedStripeSubscription },
    } as Stripe.Event;

    const mockGmailService1 = { name: "mockService1" } as any;
    const mockGmailService2 = { name: "mockService2" } as any;

    vi.mocked(getGmailService).mockImplementation(({ accessToken, refreshToken }) => {
      if (accessToken === "mock_access_token1" && refreshToken === "mock_refresh_token1") {
        return mockGmailService1;
      } else if (accessToken === "mock_access_token2" && refreshToken === "mock_refresh_token2") {
        return mockGmailService2;
      }
      throw new Error("Unexpected tokens");
    });

    await handleStripeEvent(event);

    const updatedSubscription = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.id, subscription.id),
    });

    expect(updatedSubscription).toMatchObject({
      status: "active",
      currentPeriodEnd: expect.any(Date),
      canceledAt: null,
    });

    expect(getGmailService).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "mock_access_token1", refreshToken: "mock_refresh_token1" }),
    );
    expect(getGmailService).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "mock_access_token2", refreshToken: "mock_refresh_token2" }),
    );

    expect(subscribeToMailbox).toHaveBeenCalledWith(mockGmailService1);
    expect(subscribeToMailbox).toHaveBeenCalledWith(mockGmailService2);
    expect(subscribeToMailbox).toHaveBeenCalledTimes(2);
  });
});
