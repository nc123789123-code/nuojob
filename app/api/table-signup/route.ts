import { NextRequest } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "nuoc@onluintel.com";
const FROM_EMAIL = "Onlu <noreply@onluintel.com>";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, firm, role, linkedin, note, session } = body;

    if (!name || !email || !firm || !role || !session) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Email service not configured" }, { status: 500 });
    }

    const resend = new Resend(apiKey);

    const sessionLabel = `${session.date} · ${session.theme} · ${session.location}`;

    // Send confirmation to the user
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `You're on the list — Onlu Table, ${session.date}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1A2B4A;">
          <div style="padding: 40px 32px;">
            <p style="font-size: 28px; margin: 0 0 24px;">☕</p>
            <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 8px;">You're on the list, ${name.split(" ")[0]}.</h1>
            <p style="font-size: 15px; color: #41484c; margin: 0 0 24px; line-height: 1.6;">
              We've received your request for the <strong>${session.theme}</strong> session.
            </p>

            <div style="background: #f8fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 6px; font-size: 13px; color: #71787c;">Session details</p>
              <p style="margin: 0 0 4px; font-size: 15px; font-weight: 600;">${session.date}</p>
              <p style="margin: 0 0 4px; font-size: 14px; color: #41484c;">${session.time}</p>
              <p style="margin: 0; font-size: 14px; color: #41484c;">${session.location}</p>
            </div>

            <p style="font-size: 14px; color: #41484c; line-height: 1.7; margin: 0 0 24px;">
              We'll confirm your spot within 24 hours and share the exact venue, who else is joining,
              and any notes for the conversation.
            </p>

            <p style="font-size: 14px; color: #41484c; line-height: 1.7; margin: 0;">
              Sessions are capped at <strong>8 people</strong> — small enough that everyone gets to talk.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              Onlu · Finance intelligence &amp; community · <a href="https://onlu.io" style="color: #9ca3af;">onlu.io</a>
            </p>
          </div>
        </div>
      `,
    });

    // Send admin notification
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `New Onlu Table signup — ${name} (${firm})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; color: #1A2B4A; padding: 24px;">
          <h2 style="margin: 0 0 16px;">New Table Signup</h2>
          <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #71787c; width: 100px;">Session</td><td style="padding: 6px 0;">${sessionLabel}</td></tr>
            <tr><td style="padding: 6px 0; color: #71787c;">Name</td><td style="padding: 6px 0;">${name}</td></tr>
            <tr><td style="padding: 6px 0; color: #71787c;">Email</td><td style="padding: 6px 0;">${email}</td></tr>
            <tr><td style="padding: 6px 0; color: #71787c;">Firm</td><td style="padding: 6px 0;">${firm}</td></tr>
            <tr><td style="padding: 6px 0; color: #71787c;">Role</td><td style="padding: 6px 0;">${role}</td></tr>
            <tr><td style="padding: 6px 0; color: #71787c;">LinkedIn</td><td style="padding: 6px 0;">${linkedin || "—"}</td></tr>
            <tr><td style="padding: 6px 0; color: #71787c; vertical-align: top;">Note</td><td style="padding: 6px 0;">${note || "—"}</td></tr>
          </table>
        </div>
      `,
    });

    return Response.json({ ok: true });
  } catch (e) {
    console.error("table-signup error:", e);
    return Response.json({ error: "Failed to submit — please try again" }, { status: 500 });
  }
}
