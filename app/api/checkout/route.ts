import { NextResponse } from "next/server";

import { getMedicalBillProduct, getStripeClient } from "@/lib/stripe";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_PRICE_ID) {
      return NextResponse.json(
        { error: "Missing STRIPE_PRICE_ID environment variable." },
        { status: 500 },
      );
    }

    const { fileName } = (await request.json()) as { fileName?: string };
    const stripe = getStripeClient();
    const baseUrl = getBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      metadata: {
        product: getMedicalBillProduct(),
        fileName: fileName || "uploaded-medical-bill",
      },
      success_url: `${baseUrl}/result?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create Stripe checkout session.",
      },
      { status: 500 },
    );
  }
}
