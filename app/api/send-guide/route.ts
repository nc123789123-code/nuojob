/**
 * POST /api/send-guide
 * Sends the Credit Interview Guide sample email to all RESEND_AUDIENCE_GUIDE contacts.
 * Protected by CRON_SECRET. Call manually or wire to a cron.
 *
 * Also accepts ?email=single@email.com to send to one address (for testing).
 *
 * Env vars:
 *   CRON_SECRET              — guards the endpoint
 *   RESEND_API_KEY           — existing
 *   RESEND_AUDIENCE_GUIDE    — Resend audience ID for guide-interest subscribers
 *   NEXT_PUBLIC_URL          — e.g. https://onluintel.com
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Contact { id: string; email: string; unsubscribed: boolean; }

// ─── Email template ───────────────────────────────────────────────────────────

function buildGuideEmail(email: string): string {
  const baseUrl  = process.env.NEXT_PUBLIC_URL || "https://onluintel.com";
  const unsubUrl = `${baseUrl}/unsubscribe?e=${Buffer.from(email).toString("base64url")}`;

  const teal  = "#396477";
  const navy  = "#1A2B4A";
  const light = "#f0f6f8";

  // Table of contents rows
  const toc = [
    { pages: "01–03", title: "Foundations",          desc: "Credit mindset, leverage, FCCR, free cash flow" },
    { pages: "04–06", title: "Bond Math & Valuation", desc: "YTM (exact & estimated), DCF, WACC, beta" },
    { pages: "07–09", title: "Capital Structure",     desc: "Recovery waterfall, fulcrum security, structural subordination" },
    { pages: "10–12", title: "Restructuring Process", desc: "Chapter 11, POR, cramdown, out-of-court deals" },
    { pages: "13–16", title: "Advanced Accounting",   desc: "PIK interest, asset write-downs, capex vs. expense" },
    { pages: "17–19", title: "Liability Management",  desc: "Uptiers, drop-downs, double-dips, springing maturities" },
    { pages: "20–24", title: "Case Studies",          desc: "J.Crew, PetSmart, Serta, Incora, Trinseo" },
    { pages: "25–30", title: "Interview Q&A",         desc: "15 model answers with worked examples" },
    { pages: "31–35", title: "Reference",             desc: "Ratio cheat sheet, glossary, process map, checklist" },
  ];

  const tocRows = toc.map((r, i) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;width:52px">
        <span style="font-size:11px;font-weight:700;color:${teal};font-family:monospace">${r.pages}</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;border-left:2px solid ${i % 2 === 0 ? navy : teal}">
        <div style="font-size:13px;font-weight:700;color:${navy};margin-bottom:2px">${r.title}</div>
        <div style="font-size:11px;color:#6b7280">${r.desc}</div>
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Credit Interview Guide — Sample</title>
</head>
<body style="margin:0;padding:0;background:#f3f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<div style="max-width:620px;margin:32px auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">

  <!-- Header -->
  <div style="background:${navy};padding:32px 28px 28px">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${teal};margin-bottom:8px">Onlu Intelligence</div>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#fff;line-height:1.2">Credit Interview Guide</h1>
    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6)">Sample — Chapters 1–3 · 35 pages total</p>
  </div>

  <!-- Intro -->
  <div style="padding:24px 28px 0">
    <p style="margin:0;font-size:14px;color:#374151;line-height:1.7">
      Here's a sample of the guide — covering the Foundations chapter in full.
      It's designed to help you think like a credit investor, not just recite definitions.
    </p>
  </div>

  <!-- TOC -->
  <div style="padding:24px 28px 0">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9ca3af;margin-bottom:10px">What's in the full guide</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      ${tocRows}
    </table>
  </div>

  <!-- Divider -->
  <div style="padding:28px 28px 0">
    <div style="border-top:2px solid ${light};text-align:center;padding-top:20px">
      <span style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${teal}">Sample Content — Chapter 1: Foundations</span>
    </div>
  </div>

  <!-- Formula bar -->
  <div style="margin:16px 28px 0;padding:14px 18px;background:${light};border:1px solid #c8dfe8;border-radius:8px;text-align:center">
    <span style="font-size:13px;font-weight:700;color:${teal}">Total Debt ÷ EBITDA = Leverage Multiple</span>
    <span style="font-size:13px;color:#9ca3af;margin:0 12px">|</span>
    <span style="font-size:13px;font-weight:700;color:${teal}">EBITDA ÷ Cash Interest = Coverage Ratio</span>
  </div>

  <!-- Two column cards -->
  <div style="padding:16px 28px 0;display:flex;gap:12px">
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="width:50%;vertical-align:top;padding-right:6px">
          <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;height:100%">
            <div style="font-size:12px;font-weight:700;color:${navy};margin-bottom:10px">Leverage Tolerance by Sector</div>
            <table style="width:100%;border-collapse:collapse">
              ${[
                ["SaaS / Recurring Revenue", "6–7×", "#15803d"],
                ["Healthcare / Defensive",   "4–5×", "#0369a1"],
                ["Industrial / Manufacturing","3–4×", "#d97706"],
                ["Retail / Cyclical",        "2–3×", "#dc2626"],
              ].map(([sector, val, color]) => `
              <tr>
                <td style="font-size:11px;color:#6b7280;padding:5px 0;border-bottom:1px solid #f3f4f6">${sector}</td>
                <td style="font-size:12px;font-weight:700;color:${color};text-align:right;padding:5px 0;border-bottom:1px solid #f3f4f6">${val}</td>
              </tr>`).join("")}
            </table>
          </div>
        </td>
        <td style="width:50%;vertical-align:top;padding-left:6px">
          <div style="border:2px solid ${teal};border-radius:8px;padding:14px;background:#f0f9ff;height:100%">
            <div style="font-size:11px;font-weight:700;color:${teal};margin-bottom:8px">🎯 Classic Interview Trick</div>
            <p style="margin:0 0 8px;font-size:11px;font-style:italic;color:#374151">Q: Leverage = 5×, Coverage = 5×. What's the interest rate?</p>
            <div style="font-size:11px;color:#4b5563;line-height:1.7;font-family:monospace">
              Coverage = EBITDA / (r × Debt)<br/>
              5 = EBITDA / (r × Debt)<br/>
              5r = EBITDA/Debt = 1/5<br/>
              <strong>r = 1/25 = 4%</strong>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <!-- FCCR formula -->
  <div style="margin:14px 28px 0;padding:14px 18px;background:${light};border:1px solid #c8dfe8;border-radius:8px;text-align:center">
    <span style="font-size:12px;font-weight:700;color:${navy}">FCCR = (EBITDA – Capex – Cash Taxes) ÷ (Cash Interest + Required Principal)</span>
    <span style="font-size:12px;color:#6b7280;margin-left:8px">→ Healthier than simple coverage</span>
  </div>

  <!-- FCCR worked example -->
  <div style="padding:14px 28px 0">
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="width:50%;vertical-align:top;padding-right:6px">
          <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px">
            <div style="font-size:12px;font-weight:700;color:${navy};margin-bottom:10px">Step-by-Step Calculation</div>
            <table style="width:100%;border-collapse:collapse">
              ${[
                ["EBITDA",                   "150",    "#6b7280", false],
                ["– Capital Expenditures",   "(40)",   "#6b7280", false],
                ["– Cash Taxes",             "(20)",   "#6b7280", false],
                ["= Available Cash Flow",    "90",     teal,      true ],
                ["Cash Interest",            "(60)",   "#6b7280", false],
                ["+ Required Principal",     "(20)",   "#6b7280", false],
                ["= Total Fixed Charges",    "80",     navy,      true ],
              ].map(([label, val, color, bold]) => `
              <tr>
                <td style="font-size:11px;color:${bold ? navy : "#6b7280"};padding:5px 0;border-bottom:1px solid #f3f4f6;${bold ? "font-weight:700" : ""}">${label}</td>
                <td style="font-size:11px;font-weight:${bold ? "700" : "400"};color:${color};text-align:right;padding:5px 0;border-bottom:1px solid #f3f4f6">${val}</td>
              </tr>`).join("")}
            </table>
            <div style="margin-top:10px;padding-top:8px;border-top:2px solid ${navy}">
              <span style="font-size:14px;font-weight:800;color:${teal}">FCCR = 90 ÷ 80 = 1.125×</span>
            </div>
          </div>
        </td>
        <td style="width:50%;vertical-align:top;padding-left:6px">
          <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;height:100%">
            <div style="font-size:12px;font-weight:700;color:${navy};margin-bottom:10px">What 1.125× Tells You</div>
            <div style="font-size:11px;color:#dc2626;margin-bottom:6px">⚠ Thin margin of safety</div>
            <div style="font-size:11px;color:#dc2626;margin-bottom:8px">↘ 10–15% EBITDA drop → FCCR &lt; 1.0×</div>
            <div style="font-size:11px;color:#4b5563;margin-bottom:4px">→ Below 1.0× = operations can't cover obligations</div>
            <div style="font-size:11px;color:#4b5563;margin-bottom:8px">→ May need external financing or restructuring</div>
            <div style="font-size:11px;color:#15803d">✓ FCCR &gt; interest coverage: counts capex &amp; principal</div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Key insight box -->
  <div style="margin:14px 28px 0;padding:12px 16px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px">
    <span style="font-size:11px;font-weight:700;color:#92400e">⚠ REMEMBER &nbsp;</span>
    <span style="font-size:11px;color:#78350f">Leverage must always be evaluated in context. 6× leverage in SaaS with sticky ARR is safer than 3× in a cyclical business with volatile EBITDA.</span>
  </div>

  <!-- Blurred hint of next section -->
  <div style="margin:20px 28px 0;padding:14px 18px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;opacity:0.5;text-align:center">
    <div style="font-size:11px;color:#9ca3af;margin-bottom:6px">Chapter 2 preview — Bond Math &amp; Valuation</div>
    <div style="font-size:13px;font-weight:700;color:#d1d5db;filter:blur(3px)">YTM = Coupon + (Face – Price)/n ÷ (Face + Price)/2</div>
  </div>

  <!-- CTA -->
  <div style="padding:28px;margin-top:8px;text-align:center;border-top:1px solid #f3f4f6">
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6">
      The full 35-page guide covers bond math, capital structure, 5 restructuring case studies,<br/>15 model interview Q&amp;As, and a ratio reference sheet.
    </p>
    <a href="${baseUrl}/#guide"
       style="display:inline-block;padding:13px 32px;background:${navy};color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
      Get the Full Guide →
    </a>
    <p style="margin:12px 0 0;font-size:11px;color:#9ca3af">Onlu Intelligence · Credit Interview Guide</p>
  </div>

  <!-- Footer -->
  <div style="padding:16px 28px 24px;border-top:1px solid #f3f4f6">
    <p style="margin:0;color:#d1d5db;font-size:11px;line-height:1.6">
      You're receiving this because you expressed interest in the guide at onluintel.com.<br/>
      <a href="${unsubUrl}" style="color:#d1d5db;text-decoration:underline">Unsubscribe</a>
    </p>
  </div>

</div>
</body>
</html>`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey   = process.env.RESEND_API_KEY;
  const audience = process.env.RESEND_AUDIENCE_GUIDE;
  if (!apiKey) return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });

  const resend = new Resend(apiKey);

  // Single-address test mode: ?email=you@example.com
  const singleEmail = req.nextUrl.searchParams.get("email");
  if (singleEmail) {
    const html = buildGuideEmail(singleEmail);
    const r = await resend.emails.send({
      from: "Onlu <noreply@onluintel.com>",
      to: singleEmail,
      subject: "Your Credit Interview Guide — sample inside",
      html,
      tags: [{ name: "type", value: "guide_sample" }],
    });
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, sent: 1, to: singleEmail });
  }

  // Bulk send to audience
  if (!audience) return NextResponse.json({ error: "Missing RESEND_AUDIENCE_GUIDE" }, { status: 500 });

  const contactsResp = await resend.contacts.list({ audienceId: audience });
  const contacts: Contact[] = (contactsResp.data?.data ?? []).filter((c: Contact) => !c.unsubscribed);

  if (contacts.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: "No active guide subscribers" });
  }

  let sent = 0;
  const BATCH = 10;
  for (let i = 0; i < contacts.length; i += BATCH) {
    const batch = contacts.slice(i, i + BATCH);
    await Promise.allSettled(batch.map(async (c) => {
      try {
        await resend.emails.send({
          from: "Onlu <noreply@onluintel.com>",
          to: c.email,
          subject: "Your Credit Interview Guide — sample inside",
          html: buildGuideEmail(c.email),
          headers: {
            "List-Unsubscribe": `<mailto:unsubscribe@onluintel.com>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [{ name: "type", value: "guide_sample" }],
        });
        sent++;
      } catch { /* skip individual failures */ }
    }));
    if (i + BATCH < contacts.length) await new Promise(r => setTimeout(r, 1000));
  }

  return NextResponse.json({ ok: true, sent, total: contacts.length, at: new Date().toISOString() });
}
