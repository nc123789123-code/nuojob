/**
 * Firm alert subscription endpoint.
 * Stores email + firm name in Resend as a contact tagged with the firm.
 * The cron job reads these contacts and sends alerts when new roles appear.
 *
 * Env vars needed:
 *   RESEND_API_KEY          — existing
 *   RESEND_AUDIENCE_ALERTS  — new Resend audience ID for firm alerts
 */

import { Resend } from "resend";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email: string = (body.email || "").trim().toLowerCase();
    const firm: string  = (body.firm  || "").trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (!firm) {
      return NextResponse.json({ error: "Firm name required" }, { status: 400 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY!);
    const audienceId = process.env.RESEND_AUDIENCE_ALERTS;

    const tasks: Promise<unknown>[] = [];

    // Add/update contact in the alerts audience, encoding firm in firstName
    if (audienceId) {
      tasks.push(
        resend.contacts.create({
          email,
          firstName: firm,   // firm name stored here for the cron to read
          audienceId,
          unsubscribed: false,
        })
      );
    }

    // Confirmation email to subscriber
    const baseUrl = process.env.NEXT_PUBLIC_URL || "https://onluintel.com";
    const encoded = Buffer.from(email).toString("base64url");
    tasks.push(
      resend.emails.send({
        from: "Onlu <noreply@onluintel.com>",
        to: email,
        subject: `Alert set: new roles at ${firm}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e">
            <h2 style="font-size:18px;font-weight:700;margin-bottom:8px">You're set.</h2>
            <p style="color:#555;line-height:1.6">
              We'll notify you when new front-office roles appear at <strong>${firm}</strong>.
            </p>
            <p style="color:#555;line-height:1.6">
              In the meantime, track fund signals and hiring activity at
              <a href="${baseUrl}" style="color:#2563eb">onluintel.com</a>.
            </p>
            <p style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;color:#bbb;font-size:11px;line-height:1.6">
              You're receiving this because you set a firm alert at onluintel.com.<br/>
              <a href="${baseUrl}/unsubscribe?e=${encoded}" style="color:#bbb;text-decoration:underline">Unsubscribe</a>
            </p>
          </div>`,
      })
    );

    await Promise.allSettled(tasks);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Alert subscribe failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
