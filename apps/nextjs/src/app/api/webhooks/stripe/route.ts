import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/env";
import { inngest } from "@/inngest/client";
import { ALLOWED_STRIPE_EVENTS } from "@/inngest/functions/handleStripeWebhookEvent";
import { captureExceptionAndLogIfDevelopment } from "@/lib/shared/sentry";
import { stripe } from "@/lib/stripe/client";

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("Stripe-Signature")!;

  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse("Stripe webhook secret is not set", { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    if (ALLOWED_STRIPE_EVENTS.includes(event.type)) {
      await inngest.send({
        name: "stripe/webhook",
        data: {
          stripeEvent: event,
        },
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    captureExceptionAndLogIfDevelopment(error);
    return new NextResponse("Error processing Stripe webhook", { status: 400 });
  }
}
