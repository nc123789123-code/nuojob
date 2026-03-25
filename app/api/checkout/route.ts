import Stripe from "stripe";
import { NextResponse } from "next/server";

// Node.js runtime required for Stripe
export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });
  try {
    const { email } = await req.json().catch(() => ({}));

    const baseUrl = process.env.NEXT_PUBLIC_URL || "https://onluintel.com";
    const priceInCents = parseInt(process.env.GUIDE_PRICE_CENTS || "4900", 10);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      ...(email ? { customer_email: email } : {}),
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Credit Interview Guide",
              description:
                "Case-based interview preparation for private credit, special situations, and restructuring roles.",
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/#guide`,
      metadata: { product: "credit-interview-guide", intent: "paid_customer" },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] Stripe error:", err);
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
