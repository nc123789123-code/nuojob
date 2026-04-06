import { NextRequest } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Simple token check — set ADMIN_TOKEN in Vercel env vars
  const token = req.nextUrl.searchParams.get("token");
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return Response.json({ error: "Resend not configured" }, { status: 500 });

  const resend = new Resend(apiKey);

  const audienceIds = {
    signals: process.env.RESEND_AUDIENCE_SIGNALS,
    guide:   process.env.RESEND_AUDIENCE_GUIDE,
  };

  async function countContacts(audienceId?: string): Promise<number> {
    if (!audienceId) return 0;
    try {
      const res = await (resend.contacts as any).list({ audienceId });
      return res?.data?.data?.length ?? res?.data?.length ?? 0;
    } catch { return 0; }
  }

  const [signals, guide] = await Promise.all([
    countContacts(audienceIds.signals),
    countContacts(audienceIds.guide),
  ]);

  return Response.json({
    subscribers: {
      signals,
      guide,
      total: signals + guide,
    },
    asOf: new Date().toISOString(),
  });
}
