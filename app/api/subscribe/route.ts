import { Resend } from "resend";
import { NextResponse } from "next/server";
import { buildGuideEmail } from "@/app/lib/guideEmail";

export const runtime = "nodejs";

type Intent = "signals_subscriber" | "guide_interest";

const AUDIENCE_MAP: Record<Intent, string | undefined> = {
  signals_subscriber: process.env.RESEND_AUDIENCE_SIGNALS,
  guide_interest: process.env.RESEND_AUDIENCE_GUIDE,
};

/** Add email to Beehiiv publication (newsletter subscribers only, non-blocking) */
async function addToBeehiiv(email: string) {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const pubId  = process.env.BEEHIIV_PUBLICATION_ID;
  if (!apiKey || !pubId) {
    console.error("[beehiiv] missing env vars — BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID not set");
    return;
  }
  try {
    const res = await fetch(`https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ email, reactivate_existing: true, send_welcome_email: false }),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error(`[beehiiv] subscribe failed: ${res.status}`, body);
    } else {
      console.log(`[beehiiv] subscribed: ${email}`);
    }
  } catch (e) { console.error("[beehiiv] exception:", e); }
}

function getWelcomeEmail(intent: Intent, email: string): { subject: string; html: string } {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://onluintel.com";
  const encoded = Buffer.from(email).toString("base64url");
  const unsubUrl = `${baseUrl}/unsubscribe?e=${encoded}`;

  const footer = `
    <p style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;color:#bbb;font-size:11px;line-height:1.6">
      You're receiving this because you signed up at onluintel.com.<br/>
      <a href="${unsubUrl}" style="color:#bbb;text-decoration:underline">Unsubscribe</a>
    </p>`;

  if (intent === "signals_subscriber") {
    return {
      subject: "You're on the Onlu list",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#F4F0FA">
          <h2 style="font-size:18px;font-weight:700;margin-bottom:8px">You're in.</h2>
          <p style="color:#555;line-height:1.6">
            We'll send you new fund signals, relevant roles, and market insight as they come in.
            No noise — just the signals worth knowing about.
          </p>
          <p style="color:#555;line-height:1.6">
            In the meantime, explore the platform: <a href="${baseUrl}" style="color:#2563eb">onluintel.com</a>
          </p>
          ${footer}
        </div>`,
    };
  }

  return {
    subject: "Your Credit Interview Guide — sample inside",
    html: buildGuideEmail(email),
  };
}

async function notifyAdmin(resend: Resend, email: string, intent: Intent) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;
  await resend.emails.send({
    from: "Onlu <noreply@onluintel.com>",
    to: adminEmail,
    subject: `[Onlu] New ${intent}: ${email}`,
    html: `<p>New <strong>${intent}</strong>: <a href="mailto:${email}">${email}</a></p>`,
  });
}

export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  try {
    const body = await req.json();
    const email: string = (body.email || "").trim().toLowerCase();
    const intent: Intent = body.intent === "guide_interest" ? "guide_interest" : "signals_subscriber";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const audienceId = AUDIENCE_MAP[intent];
    const welcome = getWelcomeEmail(intent, email);
    const baseUrl = process.env.NEXT_PUBLIC_URL || "https://onluintel.com";
    const encoded = Buffer.from(email).toString("base64url");
    const unsubUrl = `${baseUrl}/unsubscribe?e=${encoded}`;

    // Send welcome email
    const emailResult = await resend.emails.send({
      from: "Onlu <noreply@onluintel.com>",
      to: email,
      subject: welcome.subject,
      html: welcome.html,
      headers: {
        "List-Unsubscribe": `<mailto:unsubscribe@onluintel.com>, <${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      tags: [{ name: "type", value: "welcome" }, { name: "intent", value: intent }],
    });
    if (emailResult.error) {
      console.error("[subscribe] email send error:", JSON.stringify(emailResult.error));
      return NextResponse.json({ error: emailResult.error.message ?? "Email send failed" }, { status: 500 });
    }

    // Add to Beehiiv (all subscribers, blocking so it appears in logs)
    await addToBeehiiv(email);

    // Add to Resend audience as backup (non-blocking)
    if (audienceId && audienceId !== "audience_id_placeholder") {
      resend.contacts.create({ email, audienceId, unsubscribed: false })
        .then(r => { if (r.error) console.error("[subscribe] audience error:", JSON.stringify(r.error)); })
        .catch(e => console.error("[subscribe] audience exception:", e));
    }

    // Notify admin (non-blocking)
    notifyAdmin(resend, email, intent).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Subscribe failed";
    console.error("[subscribe] exception:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
