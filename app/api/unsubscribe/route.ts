import { Resend } from "resend";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const encoded = searchParams.get("e") || "";
    if (!encoded) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const email = Buffer.from(encoded, "base64url").toString("utf8");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY!);

    // Remove from all configured audiences
    const audienceIds = [
      process.env.RESEND_AUDIENCE_SIGNALS,
      process.env.RESEND_AUDIENCE_GUIDE,
    ].filter(Boolean) as string[];

    await Promise.allSettled(
      audienceIds.map((audienceId) =>
        resend.contacts.update({ email, audienceId, unsubscribed: true })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unsubscribe failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
