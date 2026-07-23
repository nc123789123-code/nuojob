export const runtime = "nodejs";
import Stripe from "stripe";

const PLANS = {
  monthly: { amount: 500, interval: "month" as const, label: "Onlu Pro — Monthly" },
  annual: { amount: 4500, interval: "year" as const, label: "Onlu Pro — Annual" },
} as const;

type Plan = keyof typeof PLANS;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const plan: Plan = body.plan === "annual" ? "annual" : "monthly";
  const email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : undefined;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });
  const base = process.env.NEXT_PUBLIC_URL || "https://onluintel.com";
  const p = PLANS[plan];

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      ...(email ? { customer_email: email } : {}),
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: p.amount,
            recurring: { interval: p.interval },
            product_data: {
              name: p.label,
              description:
                "Onlu Pro — full daily jobs digest, real-time fund signals, unlimited case studies, and AI interview coach.",
            },
          },
          quantity: 1,
        },
      ],
      metadata: { product: "pro", plan },
      subscription_data: { metadata: { product: "pro", plan } },
      allow_promotion_codes: true,
      success_url: `${base}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/pricing`,
    });

    return Response.json({ url: checkout.url });
  } catch (err) {
    console.error("[pro-checkout] Stripe error:", err);
    const message = err instanceof Error ? err.message : "Checkout failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
