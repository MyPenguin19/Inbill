import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getStripeClient, isPaidMedicalBillSession } from "@/lib/stripe";

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
  }

  return secret;
}

export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
    }

    const body = await request.text();
    const event = stripe.webhooks.constructEvent(body, signature, getWebhookSecret());

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (isPaidMedicalBillSession(session)) {
        console.info("Stripe checkout completed for medical bill analysis", {
          sessionId: session.id,
          fileName: session.metadata?.fileName || null,
          amountTotal: session.amount_total || null,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to verify Stripe webhook.",
      },
      { status: 400 },
    );
  }
}
