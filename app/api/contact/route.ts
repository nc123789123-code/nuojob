import { Resend } from "resend";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { name, email, message } = await req.json();

  if (!email || !message) {
    return NextResponse.json({ error: "Email and message are required." }, { status: 400 });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Onlu Contact Form <noreply@onluintel.com>",
      to: "info@onluintel.com",
      replyTo: email,
      subject: `[Onlu] Contact from ${name || email}`,
      html: `
        <p><strong>Name:</strong> ${name || "—"}</p>
        <p><strong>Email:</strong> ${email}</p>
        <hr />
        <p>${message.replace(/\n/g, "<br />")}</p>
      `,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact send error:", err);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}
