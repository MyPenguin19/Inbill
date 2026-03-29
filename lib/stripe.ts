import Stripe from "stripe";

let stripeClient: Stripe | null = null;
const MEDICAL_BILL_PRODUCT = "medical_bill_analysis";

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
      typescript: true,
    });
  }

  return stripeClient;
}

export function getMedicalBillProduct() {
  return MEDICAL_BILL_PRODUCT;
}

export function isPaidMedicalBillSession(session: Stripe.Checkout.Session) {
  return (
    session.payment_status === "paid" &&
    session.mode === "payment" &&
    session.metadata?.product === MEDICAL_BILL_PRODUCT
  );
}

export async function verifyMedicalBillSession(sessionId: string) {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return isPaidMedicalBillSession(session);
}
