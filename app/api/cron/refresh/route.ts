/**
 * Cron endpoint — warms the jobs and fund-search caches every hour.
 * Vercel calls this with Authorization: Bearer <CRON_SECRET>.
 * Set CRON_SECRET in your Vercel environment variables.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const results = await Promise.allSettled([
    fetch(`${base}/api/jobs?dateRange=90&category=all&signalTag=all`),
    fetch(`${base}/api/search?query=&strategy=all&dateRange=90&minAmount=`),
  ]);

  const statuses = results.map((r) =>
    r.status === "fulfilled" ? r.value.status : "failed"
  );

  return NextResponse.json({
    ok: true,
    refreshed: ["jobs", "search"],
    statuses,
    at: new Date().toISOString(),
  });
}
