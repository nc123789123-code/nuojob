/**
 * GET /api/send-guide
 * Sends the Credit Interview Guide sample email to all RESEND_AUDIENCE_GUIDE contacts.
 * Protected by CRON_SECRET. Also accepts ?email= for single-address testing.
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { buildGuideEmail } from "@/app/lib/guideEmail";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Contact { id: string; email: string; unsubscribed: boolean; }

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey   = process.env.RESEND_API_KEY;
  const audience = process.env.RESEND_AUDIENCE_GUIDE;
  if (!apiKey) return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });

  const resend = new Resend(apiKey);

  // Single-address test mode: ?email=you@example.com
  const singleEmail = req.nextUrl.searchParams.get("email");
  if (singleEmail) {
    const r = await resend.emails.send({
      from: "Onlu <noreply@onluintel.com>",
      to: singleEmail,
      subject: "Your Credit Interview Guide — sample inside",
      html: buildGuideEmail(singleEmail),
      tags: [{ name: "type", value: "guide_sample" }],
    });
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, sent: 1, to: singleEmail });
  }

  // Bulk send to audience
  if (!audience) return NextResponse.json({ error: "Missing RESEND_AUDIENCE_GUIDE" }, { status: 500 });

  const contactsResp = await resend.contacts.list({ audienceId: audience });
  const contacts: Contact[] = (contactsResp.data?.data ?? []).filter((c: Contact) => !c.unsubscribed);

  if (contacts.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: "No active guide subscribers" });
  }

  let sent = 0;
  const BATCH = 10;
  for (let i = 0; i < contacts.length; i += BATCH) {
    const batch = contacts.slice(i, i + BATCH);
    await Promise.allSettled(batch.map(async (c) => {
      try {
        await resend.emails.send({
          from: "Onlu <noreply@onluintel.com>",
          to: c.email,
          subject: "Your Credit Interview Guide — sample inside",
          html: buildGuideEmail(c.email),
          headers: {
            "List-Unsubscribe": `<mailto:unsubscribe@onluintel.com>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [{ name: "type", value: "guide_sample" }],
        });
        sent++;
      } catch { /* skip individual failures */ }
    }));
    if (i + BATCH < contacts.length) await new Promise(r => setTimeout(r, 1000));
  }

  return NextResponse.json({ ok: true, sent, total: contacts.length, at: new Date().toISOString() });
}
