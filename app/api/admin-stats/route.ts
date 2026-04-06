import { NextRequest } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Simple token check — set ADMIN_TOKEN in Vercel env vars
  const token = req.nextUrl.searchParams.get("token");
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use full-access key for reading contacts (RESEND_API_KEY is send-only)
  const apiKey = process.env.RESEND_API_KEY_FULL ?? process.env.RESEND_API_KEY;
  if (!apiKey) return Response.json({ error: "Resend not configured" }, { status: 500 });

  const resend = new Resend(apiKey);

  const audienceIds = {
    signals: process.env.RESEND_AUDIENCE_SIGNALS,
    guide:   process.env.RESEND_AUDIENCE_GUIDE,
  };

  async function countContacts(audienceId?: string): Promise<{ count: number; raw: unknown }> {
    if (!audienceId) return { count: 0, raw: null };
    try {
      const res = await (resend.contacts as any).list({ audienceId });
      // Try every known shape of the Resend contacts.list response
      const data = res?.data?.data ?? res?.data ?? res;
      const count = Array.isArray(data) ? data.length : 0;
      return { count, raw: res };
    } catch (e) { return { count: 0, raw: String(e) }; }
  }

  const [signals, guide] = await Promise.all([
    countContacts(audienceIds.signals),
    countContacts(audienceIds.guide),
  ]);

  return Response.json({
    subscribers: {
      signals: signals.count,
      guide: guide.count,
      total: signals.count + guide.count,
    },
    debug: { signals: signals.raw, guide: guide.raw },
    asOf: new Date().toISOString(),
  });
}
