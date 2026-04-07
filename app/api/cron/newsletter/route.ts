/**
 * Weekly newsletter cron — runs Monday 8 AM UTC (vercel.json: "0 8 * * 1").
 *
 * 1. Fetches fresh market, distressed, and jobs data from existing API routes.
 * 2. Asks Claude Haiku to write a 2-3 sentence editorial intro from the data.
 * 3. Sends a formatted HTML newsletter to all active RESEND_AUDIENCE_SIGNALS subscribers.
 *
 * Env vars required:
 *   CRON_SECRET               — optional, guards the endpoint
 *   RESEND_API_KEY            — existing
 *   RESEND_AUDIENCE_SIGNALS   — Resend audience ID for newsletter subscribers
 *   ANTHROPIC_API_KEY         — existing (Claude Haiku for editorial)
 *   NEXT_PUBLIC_URL           — e.g. https://onluintel.com
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Contact { id: string; email: string; unsubscribed: boolean; }
interface MarketTicker { symbol: string; name: string; price: number; change: number; change_pct: number; }
interface DistressedSituation { company: string; type: string; headline?: string; whyItMatters: string; }
interface JobSignal { firm: string; role: string; category: string; location: string; }

// ─── HTML template ────────────────────────────────────────────────────────────

function buildEmail(
  email: string,
  {
    intro, market, distressed, jobs, weekLabel,
  }: {
    intro: string;
    market: MarketTicker[];
    distressed: DistressedSituation[];
    jobs: JobSignal[];
    weekLabel: string;
  }
): string {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://onluintel.com";
  const unsubUrl = `${baseUrl}/unsubscribe?e=${Buffer.from(email).toString("base64url")}`;

  const marketRows = market.slice(0, 6).map(t => {
    const up = t.change_pct >= 0;
    const arrow = up ? "▲" : "▼";
    const color = up ? "#15803d" : "#dc2626";
    return `<tr>
      <td style="padding:6px 0;color:#555;font-size:13px">${t.name}</td>
      <td style="padding:6px 0;text-align:right;font-size:13px;font-weight:600;color:#1a1a2e">${t.price.toLocaleString()}</td>
      <td style="padding:6px 0;text-align:right;font-size:13px;font-weight:600;color:${color}">${arrow} ${Math.abs(t.change_pct).toFixed(1)}%</td>
    </tr>`;
  }).join("");

  const distressedBlock = distressed.slice(0, 4).map(s => {
    const badge = s.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return `<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #f3f4f6">
      <div style="font-size:13px;font-weight:700;color:#1a1a2e">
        ${s.company}
        <span style="font-size:10px;font-weight:600;color:#dc2626;background:#fef2f2;padding:2px 7px;border-radius:4px;margin-left:6px">${badge}</span>
      </div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;line-height:1.55">${s.whyItMatters}</div>
    </div>`;
  }).join("");

  const jobBlock = jobs.slice(0, 8).map(j =>
    `<div style="margin-bottom:8px">
      <span style="font-size:13px;font-weight:600;color:#1a1a2e">${j.role}</span>
      <span style="font-size:12px;color:#9ca3af"> · ${j.firm}${j.location && j.location !== "—" ? ` · ${j.location}` : ""}</span>
    </div>`
  ).join("");

  const section = (label: string, content: string) => `
    <div style="padding:0 24px;margin-top:24px">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9ca3af;margin-bottom:12px">${label}</div>
      ${content}
    </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:580px;margin:32px auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">

  <!-- Header -->
  <div style="padding:28px 24px 0">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#396477">Onlu Intelligence</div>
    <h1 style="font-size:20px;font-weight:700;margin:6px 0 2px;color:#111827;line-height:1.2">Weekly Brief</h1>
    <div style="font-size:12px;color:#9ca3af">${weekLabel}</div>
  </div>

  <!-- Editorial intro -->
  <div style="margin:20px 24px 0;padding:16px 18px;background:#f0f9ff;border-radius:8px;border-left:3px solid #396477">
    <p style="margin:0;font-size:13px;line-height:1.7;color:#374151">${intro}</p>
  </div>

  ${market.length > 0 ? section("📊 Market Brief", `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="font-size:11px;font-weight:600;color:#9ca3af;text-align:left;padding-bottom:6px">Asset</th>
          <th style="font-size:11px;font-weight:600;color:#9ca3af;text-align:right;padding-bottom:6px">Price</th>
          <th style="font-size:11px;font-weight:600;color:#9ca3af;text-align:right;padding-bottom:6px">Chg</th>
        </tr>
      </thead>
      <tbody>${marketRows}</tbody>
    </table>`) : ""}

  ${distressed.length > 0 ? section("⚠️ Distressed Watch", distressedBlock) : ""}

  ${jobs.length > 0 ? section("💼 Hiring Signals", jobBlock) : ""}

  <!-- CTA -->
  <div style="padding:24px;margin-top:24px;text-align:center;border-top:1px solid #f3f4f6">
    <a href="${baseUrl}" style="display:inline-block;padding:11px 28px;background:#396477;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
      View Full Platform →
    </a>
    <p style="margin:12px 0 0;font-size:12px;color:#9ca3af">Market Brief · Fund Signals · Hiring Watch · Case Library</p>
  </div>

  <!-- Footer -->
  <div style="padding:16px 24px 28px;border-top:1px solid #f3f4f6">
    <p style="margin:0;color:#d1d5db;font-size:11px;line-height:1.6">
      You're receiving this because you subscribed at onluintel.com.<br/>
      <a href="${unsubUrl}" style="color:#d1d5db;text-decoration:underline">Unsubscribe</a>
    </p>
  </div>
</div>
</body>
</html>`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey    = process.env.RESEND_API_KEY;
  const audience  = process.env.RESEND_AUDIENCE_SIGNALS;
  if (!apiKey || !audience) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY or RESEND_AUDIENCE_SIGNALS" }, { status: 500 });
  }

  const resend        = new Resend(apiKey);
  const internalBase  = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  // 1. Fetch data in parallel
  const [mktRes, distRes, jobsRes] = await Promise.allSettled([
    fetch(`${internalBase}/api/market-prices`).then(r => r.ok ? r.json() : []),
    fetch(`${internalBase}/api/distressed`).then(r => r.ok ? r.json() : []),
    fetch(`${internalBase}/api/jobs?dateRange=7&category=all&signalTag=all`).then(r => r.ok ? r.json() : { signals: [] }),
  ]);

  const market:     MarketTicker[]        = mktRes.status   === "fulfilled" ? (mktRes.value   ?? [])            : [];
  const distressed: DistressedSituation[] = distRes.status  === "fulfilled" ? (distRes.value  ?? [])            : [];
  const jobs:       JobSignal[]           = jobsRes.status  === "fulfilled" ? (jobsRes.value?.signals ?? [])    : [];

  // 2. Generate editorial intro with Claude Haiku
  let intro = "Here are this week's key signals for buyside professionals — market moves, distressed situations, and hiring activity across alternative asset managers.";
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const mktSummary   = market.slice(0, 4).map(t => `${t.name} ${t.change_pct > 0 ? "+" : ""}${t.change_pct.toFixed(1)}%`).join(", ");
    const distSummary  = distressed.slice(0, 3).map(s => s.company).join(", ");
    const jobsCount    = jobs.length;

    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 130,
      messages: [{
        role: "user",
        content: `Write a 2-3 sentence editorial introduction for a weekly buyside intelligence newsletter.
Tone: sharp, analytical, professional — like a senior credit investor scanning the week.
No fluff, no padding. Start with the most interesting observation.
Data: Markets — ${mktSummary || "mixed session"}. Distressed filings — ${distSummary || "quiet week"}. Hiring signals — ${jobsCount} roles tracked.
Reply with only the intro text. No labels or bullets.`,
      }],
    });

    const block = msg.content[0];
    if (block.type === "text" && block.text.trim()) intro = block.text.trim();
  } catch { /* use default intro */ }

  // 3. Fetch active subscribers
  const contactsResp = await resend.contacts.list({ audienceId: audience });
  const contacts: Contact[] = (contactsResp.data?.data ?? []).filter((c: Contact) => !c.unsubscribed);

  if (contacts.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: "No active subscribers" });
  }

  // 4. Build and send
  const now       = new Date();
  const weekLabel = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const subject   = `Onlu Weekly — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })}: Signals & Market Brief`;
  const baseUrl   = process.env.NEXT_PUBLIC_URL || "https://onluintel.com";

  let sent = 0;
  const BATCH = 10;
  for (let i = 0; i < contacts.length; i += BATCH) {
    const batch = contacts.slice(i, i + BATCH);
    await Promise.allSettled(
      batch.map(async (c) => {
        const html    = buildEmail(c.email, { intro, market, distressed, jobs, weekLabel });
        const unsubUrl = `${baseUrl}/unsubscribe?e=${Buffer.from(c.email).toString("base64url")}`;
        try {
          await resend.emails.send({
            from: "Onlu <noreply@onluintel.com>",
            to: c.email,
            subject,
            html,
            headers: {
              "List-Unsubscribe": `<mailto:unsubscribe@onluintel.com>, <${unsubUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          });
          sent++;
        } catch { /* skip individual failures */ }
      })
    );
    // Throttle between batches
    if (i + BATCH < contacts.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    subscribers: contacts.length,
    sections: {
      market: market.length,
      distressed: distressed.length,
      jobs: jobs.length,
    },
    at: new Date().toISOString(),
  });
}
