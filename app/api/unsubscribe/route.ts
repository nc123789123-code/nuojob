import { Resend } from "resend";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function removeFromBeehiiv(email: string) {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const pubId  = process.env.BEEHIIV_PUBLICATION_ID;
  if (!apiKey || !pubId) return;
  try {
    // Look up subscriber by email first
    const search = await fetch(
      `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions?email=${encodeURIComponent(email)}&limit=1`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!search.ok) return;
    const data = await search.json();
    const subId = data?.data?.[0]?.id;
    if (!subId) return;
    // Unsubscribe
    await fetch(
      `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions/${subId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ status: "inactive" }),
      }
    );
  } catch (e) { console.error("[beehiiv] unsubscribe exception:", e); }
}

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

    // Remove from all configured Resend audiences
    const audienceIds = [
      process.env.RESEND_AUDIENCE_SIGNALS,
      process.env.RESEND_AUDIENCE_GUIDE,
    ].filter(Boolean) as string[];

    await Promise.allSettled([
      ...audienceIds.map((audienceId) =>
        resend.contacts.update({ email, audienceId, unsubscribed: true })
      ),
      removeFromBeehiiv(email),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unsubscribe failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
