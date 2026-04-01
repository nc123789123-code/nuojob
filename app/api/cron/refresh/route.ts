/**
 * Cron endpoint — runs hourly (vercel.json schedule: "0 * * * *").
 * 1. Warms the jobs and fund-search caches.
 * 2. Fetches today's fresh job signals (daysAgo = 0).
 * 3. Reads firm-alert subscribers from Resend and sends matching alerts.
 *
 * Env vars:
 *   CRON_SECRET             — optional, guards the endpoint
 *   RESEND_API_KEY          — existing
 *   RESEND_AUDIENCE_ALERTS  — Resend audience ID for firm alert subscribers
 *   NEXT_PUBLIC_URL         — e.g. https://onluintel.com
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";
export const maxDuration = 30;

interface JobSignal { id: string; firm: string; role: string; category: string; location: string; daysAgo: number; edgarUrl?: string; }
interface Contact   { id: string; email: string; firstName?: string; unsubscribed: boolean; }

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

  // 1. Warm caches
  const cacheResults = await Promise.allSettled([
    fetch(`${base}/api/jobs?dateRange=90&category=all&signalTag=all`),
    fetch(`${base}/api/search?query=&strategy=all&dateRange=90&minAmount=`),
  ]);
  const cacheStatuses = cacheResults.map((r) =>
    r.status === "fulfilled" ? r.value.status : "failed"
  );

  // 2. Fetch today's jobs (daysAgo = 0)
  let freshJobs: JobSignal[] = [];
  try {
    const res = await fetch(`${base}/api/jobs?dateRange=1&category=all&signalTag=all`);
    if (res.ok) {
      const data = await res.json();
      freshJobs = (data.signals ?? []).filter((j: JobSignal) => j.daysAgo === 0);
    }
  } catch { /* continue without alerts */ }

  // 3. Send firm alerts if there are fresh jobs and alert subscribers exist
  let alertsSent = 0;
  const audienceId = process.env.RESEND_AUDIENCE_ALERTS;
  const apiKey     = process.env.RESEND_API_KEY;

  if (freshJobs.length > 0 && audienceId && apiKey) {
    const resend = new Resend(apiKey);
    const baseUrl = process.env.NEXT_PUBLIC_URL || "https://onluintel.com";

    try {
      // Fetch all alert subscribers (up to 1000)
      const contactsRes = await resend.contacts.list({ audienceId });
      const contacts: Contact[] = (contactsRes.data?.data ?? []).filter(
        (c: Contact) => !c.unsubscribed && c.firstName
      );

      // Group fresh jobs by normalised firm name
      const jobsByFirm = new Map<string, JobSignal[]>();
      for (const job of freshJobs) {
        const key = job.firm.toLowerCase().trim();
        if (!jobsByFirm.has(key)) jobsByFirm.set(key, []);
        jobsByFirm.get(key)!.push(job);
      }

      // Send to matching subscribers
      const sends = contacts
        .filter((c) => {
          const watchFirm = (c.firstName ?? "").toLowerCase().trim();
          return [...jobsByFirm.keys()].some(
            (k) => k.includes(watchFirm) || watchFirm.includes(k)
          );
        })
        .map(async (c) => {
          const watchFirm = (c.firstName ?? "").toLowerCase().trim();
          const matching  = [...jobsByFirm.entries()]
            .filter(([k]) => k.includes(watchFirm) || watchFirm.includes(k))
            .flatMap(([, jobs]) => jobs);

          if (!matching.length) return;

          const encoded = Buffer.from(c.email).toString("base64url");
          const roleList = matching
            .map((j) => `<li style="margin-bottom:8px"><strong>${j.role}</strong> · ${j.firm}${j.location !== "—" ? ` · ${j.location}` : ""}${j.edgarUrl ? ` · <a href="${j.edgarUrl}" style="color:#2563eb">Apply ↗</a>` : ""}</li>`)
            .join("");

          await resend.emails.send({
            from: "Onlu Alerts <noreply@onluintel.com>",
            to: c.email,
            subject: `New role${matching.length > 1 ? "s" : ""} at ${c.firstName}`,
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e">
                <h2 style="font-size:18px;font-weight:700;margin-bottom:8px">New role${matching.length > 1 ? "s" : ""} at ${c.firstName}</h2>
                <ul style="padding-left:16px;color:#555;line-height:1.8">${roleList}</ul>
                <p style="margin-top:16px"><a href="${baseUrl}?tab=hiring" style="display:inline-block;padding:10px 20px;background:#0f172a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View on Onlu →</a></p>
                <p style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;color:#bbb;font-size:11px;line-height:1.6">
                  You're receiving this because you set a firm alert at onluintel.com.<br/>
                  <a href="${baseUrl}/unsubscribe?e=${encoded}" style="color:#bbb;text-decoration:underline">Unsubscribe</a>
                </p>
              </div>`,
          });
          alertsSent++;
        });

      await Promise.allSettled(sends);
    } catch { /* don't fail the cron if alerts error */ }
  }

  return NextResponse.json({
    ok: true,
    refreshed: ["jobs", "search"],
    cacheStatuses,
    freshJobs: freshJobs.length,
    alertsSent,
    at: new Date().toISOString(),
  });
}
