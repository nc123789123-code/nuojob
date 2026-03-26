import { Resend } from "resend";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Intent = "signals_subscriber" | "guide_interest";

const AUDIENCE_MAP: Record<Intent, string | undefined> = {
  signals_subscriber: process.env.RESEND_AUDIENCE_SIGNALS,
  guide_interest: process.env.RESEND_AUDIENCE_GUIDE,
};

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
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e">
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
    subject: "Credit Interview Guide — sample + table of contents",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e">
        <h2 style="font-size:18px;font-weight:700;margin-bottom:8px">Here's your sample.</h2>
        <p style="color:#555;line-height:1.6">
          Thanks for your interest in the Credit Interview Guide.
          The sample and table of contents are attached.
        </p>
        <p style="color:#555;line-height:1.6">
          The full guide covers case-based examples, restructuring scenarios, and interview-ready
          frameworks designed to help you think like a credit investor — not just recite answers.
        </p>
        <a href="${baseUrl}/#guide"
           style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0f172a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          Get the Full Guide →
        </a>
        ${footer}
      </div>`,
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

    const tasks: Promise<unknown>[] = [
      resend.emails.send({
        from: "Onlu <noreply@onluintel.com>",
        to: email,
        subject: welcome.subject,
        html: welcome.html,
        headers: {
          "List-Unsubscribe": `<mailto:unsubscribe@onluintel.com>, <${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
      notifyAdmin(resend, email, intent),
    ];

    if (audienceId && audienceId !== "audience_id_placeholder") {
      tasks.push(
        resend.contacts.create({ email, audienceId, unsubscribed: false })
      );
    }

    await Promise.allSettled(tasks);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Subscribe failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
