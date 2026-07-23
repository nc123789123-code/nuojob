import Stripe from "stripe";

/**
 * Authoritative Pro check: does this email have an active "pro" subscription
 * in Stripe? Reading from Stripe means cancellations are reflected
 * automatically — no separate entitlement store to keep in sync.
 */
export async function isProByEmail(email: string): Promise<boolean> {
  if (!email || !process.env.STRIPE_SECRET_KEY) return false;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });
  try {
    const customers = await stripe.customers.list({ email, limit: 5 });
    for (const c of customers.data) {
      for (const status of ["active", "trialing"] as const) {
        const subs = await stripe.subscriptions.list({ customer: c.id, status, limit: 10 });
        if (subs.data.some((s) => s.metadata?.product === "pro")) return true;
      }
    }
  } catch (err) {
    console.error("[isProByEmail]", err);
  }
  return false;
}
