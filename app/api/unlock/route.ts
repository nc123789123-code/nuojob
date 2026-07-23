export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { sign, SESSION_COOKIE } from "@/app/lib/session";
import { isProByEmail } from "@/app/lib/pro";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  const pro = await isProByEmail(email);
  const token = sign({ email, pro, ts: Date.now() });

  const res = NextResponse.json({ email, pro });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60, // 60 days
  });

  // Best-effort: add them to the newsletter funnel via the existing endpoint.
  const base = process.env.NEXT_PUBLIC_URL || "https://onluintel.com";
  fetch(`${base}/api/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, intent: "signals_subscriber" }),
  }).catch(() => {});

  return res;
}
