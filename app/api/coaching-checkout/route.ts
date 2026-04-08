export const runtime = "nodejs";
import Stripe from "stripe";

const SESSIONS = {
  resume: {
    name: "Resume & Profile Review",
    description: "45-min session. We review your CV, LinkedIn, and positioning for buyside roles.",
    amount: 9900, // $99
    duration: "45 min",
  },
  mock: {
    name: "Mock Interview",
    description: "60-min live mock with real credit/PE technicals, LBO walkthrough, and feedback.",
    amount: 14900, // $149
    duration: "60 min",
  },
  strategy: {
    name: "Career Strategy Session",
    description: "60-min session covering your full recruiting roadmap — from sourcing to offer.",
    amount: 19900, // $199
    duration: "60 min",
  },
} as const;

export type SessionType = keyof typeof SESSIONS;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { sessionType } = body as { sessionType: SessionType };

  if (!sessionType || !(sessionType in SESSIONS)) {
    return Response.json({ error: "Invalid session type" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });
  const session = SESSIONS[sessionType];
  const base = process.env.NEXT_PUBLIC_URL || "https://onluintel.com";

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: session.amount,
          product_data: {
            name: session.name,
            description: session.description,
          },
        },
        quantity: 1,
      }],
      metadata: { product: "coaching", sessionType },
      success_url: `${base}/coaching/success?session_id={CHECKOUT_SESSION_ID}&type=${sessionType}`,
      cancel_url: `${base}/coaching`,
    });

    return Response.json({ url: checkout.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
