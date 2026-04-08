import Stripe from "stripe";
import { Resend } from "resend";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function sendGuideEmail(email: string) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  await resend.emails.send({
    from: "Onlu <noreply@onluintel.com>",
    to: email,
    subject: "Your Credit Interview Guide — access inside",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e">
        <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Your guide is ready.</h2>
        <p style="color:#555;line-height:1.6">
          Thank you for your purchase. Your <strong>Credit Interview Guide</strong> is attached below.
        </p>
        <p style="color:#555;line-height:1.6">
          The guide is designed to help you think like a credit investor in interviews — not just memorise technicals.
          Work through the case examples and frameworks before your next conversation.
        </p>
        <a href="${process.env.NEXT_PUBLIC_URL || "https://onluintel.com"}/guide-download"
           style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0f172a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          Access Your Guide →
        </a>
        <p style="margin-top:24px;color:#888;font-size:12px">
          Questions? Reply to this email and we'll get back to you.
        </p>
      </div>
    `,
  });
}

async function notifyAdmin(email: string, intent: string) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;
  await resend.emails.send({
    from: "Onlu <noreply@onluintel.com>",
    to: adminEmail,
    subject: `[Onlu] New ${intent}: ${email}`,
    html: `<p>New <strong>${intent}</strong>: <a href="mailto:${email}">${email}</a></p>`,
  });
}

const SESSION_LABELS: Record<string, string> = {
  resume: "Resume & Profile Review",
  mock: "Mock Interview",
  strategy: "Career Strategy Session",
};

async function sendCoachingConfirmation(email: string, sessionType: string) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const label = SESSION_LABELS[sessionType] || "Coaching Session";
  const base = process.env.NEXT_PUBLIC_URL || "https://onluintel.com";
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;
  await resend.emails.send({
    from: "Onlu <noreply@onluintel.com>",
    to: email,
    subject: `Your ${label} is confirmed — Onlu`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e">
        <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">You're booked.</h2>
        <p style="color:#555;line-height:1.6">
          Your <strong>${label}</strong> is confirmed. Click the link below to pick a time that works for you.
        </p>
        ${calendlyUrl
          ? `<a href="${calendlyUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1A2B4A;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Schedule your session →</a>`
          : `<a href="${base}/coaching/success?type=${sessionType}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1A2B4A;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View booking details →</a>`
        }
        <p style="margin-top:24px;color:#888;font-size:13px;line-height:1.6">
          Before the session: have your CV ready, jot down your top questions, and note the firms you are targeting.
        </p>
        <p style="margin-top:16px;color:#aaa;font-size:12px">
          Questions? Reply to this email and we'll get back to you.
        </p>
      </div>
    `,
  });
}

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email =
      session.customer_email ||
      (typeof session.customer_details?.email === "string"
        ? session.customer_details.email
        : null);

    const product = session.metadata?.product;
    const sessionType = session.metadata?.sessionType || "";

    if (email) {
      if (product === "coaching") {
        await Promise.allSettled([
          sendCoachingConfirmation(email, sessionType),
          notifyAdmin(email, `coaching_${sessionType}`),
        ]);
      } else {
        await Promise.allSettled([
          sendGuideEmail(email),
          notifyAdmin(email, "paid_customer"),
        ]);
      }
    }
  }

  return NextResponse.json({ received: true });
}
