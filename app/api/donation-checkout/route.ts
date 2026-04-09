export const runtime = "nodejs";
import Stripe from "stripe";

const PRESETS = [500, 1000, 2500, 5000]; // cents: $5, $10, $25, $50

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { amount } = body as { amount: number }; // in cents

  if (!amount || amount < 100 || amount > 100000) {
    return Response.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (!PRESETS.includes(amount) && (amount % 100 !== 0)) {
    return Response.json({ error: "Invalid amount" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });
  const base = process.env.NEXT_PUBLIC_URL || "https://onluintel.com";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: {
            name: "Support Onlu",
            description: "Keep the platform free and independent. Thank you.",
          },
        },
        quantity: 1,
      }],
      metadata: { product: "donation", amount: String(amount) },
      success_url: `${base}/donate/thanks`,
      cancel_url: `${base}/donate`,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
