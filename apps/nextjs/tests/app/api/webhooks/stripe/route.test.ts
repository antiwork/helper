import { mockInngest } from "@tests/support/inngestUtils";
import { envMock } from "@tests/support/mockEnv";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/webhooks/stripe/route";
import { env } from "@/env";
import { stripe } from "@/lib/stripe/client";

const inngestMock = mockInngest();

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

vi.mock("@/env", () => ({
  env: {
    ...envMock(),
    STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
    ABLY_API_KEY: "test.key",
    ADDITIONAL_PAID_ORGANIZATION_IDS: "org_1234567890",
  },
}));

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("processes valid Stripe webhook events and sends to Inngest", async () => {
    const payload = JSON.stringify({ type: "checkout.session.completed", data: { object: {} } });
    const signature = "valid_signature";

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: "checkout.session.completed",
      data: { object: {} },
    } as any);

    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: payload,
      headers: {
        "Stripe-Signature": signature,
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(204);
    expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    expect(inngestMock.send).toHaveBeenCalledWith({
      name: "stripe/webhook",
      data: {
        stripeEvent: {
          type: "checkout.session.completed",
          data: { object: {} },
        },
      },
    });
  });

  it("returns 400 for invalid Stripe signatures", async () => {
    const payload = JSON.stringify({ type: "checkout.session.completed", data: { object: {} } });
    const signature = "invalid_signature";

    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: payload,
      headers: {
        "Stripe-Signature": signature,
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    expect(inngestMock.send).not.toHaveBeenCalled();
  });

  it("does not send to Inngest for non-allowed Stripe events", async () => {
    const payload = JSON.stringify({ type: "non.allowed.event", data: { object: {} } });
    const signature = "valid_signature";

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: "non.allowed.event",
      data: { object: {} },
    } as any);

    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: payload,
      headers: {
        "Stripe-Signature": signature,
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(204);
    expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    expect(inngestMock.send).not.toHaveBeenCalled();
  });
});
