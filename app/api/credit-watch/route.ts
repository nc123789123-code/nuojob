/**
 * Credit Watch API
 *
 * Given a company name, returns:
 *   1. Bond/loan prices from FINRA TRACE OTC bond search
 *   2. SEC EDGAR filing context (latest 10-K / 10-Q reference)
 *   3. Claude Haiku cap structure + leverage snapshot
 *
 * No API keys required for FINRA or EDGAR.
 * Cached per company for 1 hour.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BondQuote {
  cusip: string;
  description: string;        // e.g. "MICHAELS COS INC 5.25 11/01/2028"
  lastPrice: number | null;   // cents on the dollar
  lastYield: number | null;   // %
  lastTradeDate: string | null;
  coupon: number | null;
  maturity: string | null;
  rating: string | null;
}

export interface CreditWatchResult {
  company: string;
  bonds: BondQuote[];
  edgarUrl: string | null;
  snapshot: string;           // Claude Haiku cap structure summary
  disclaimer: string;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const cache = new Map<string, { data: CreditWatchResult; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ─── FINRA TRACE bond search ──────────────────────────────────────────────────

async function fetchFinraBonds(company: string): Promise<BondQuote[]> {
  try {
    // FINRA market data — search OTC bonds by issuer keyword
    const encoded = encodeURIComponent(company);
    const url = `https://services.finra.org/apps/marketdata/fixed-income/otc/search?symbol=${encoded}&sortfield=lastTradeDate&sorttype=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Onlu/1.0 research@onluintel.com" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json() as Array<Record<string, unknown>>;
    if (!Array.isArray(data)) return [];

    return data.slice(0, 8).map((b) => ({
      cusip:         String(b.cusip         ?? b.CUSIP        ?? ""),
      description:   String(b.issueDesc     ?? b.description  ?? b.securityDescription ?? ""),
      lastPrice:     b.lastPrice    != null ? Number(b.lastPrice)    : null,
      lastYield:     b.lastYield    != null ? Number(b.lastYield)    : null,
      lastTradeDate: b.lastTradeDate != null ? String(b.lastTradeDate) : null,
      coupon:        b.coupon       != null ? Number(b.coupon)       : null,
      maturity:      b.maturityDate != null ? String(b.maturityDate) : null,
      rating:        String(b.moodysRating ?? b.spRating ?? b.fitchRating ?? ""),
    })).filter(b => b.description || b.cusip);
  } catch {
    return [];
  }
}

// ─── SEC EDGAR company lookup ─────────────────────────────────────────────────

async function fetchEdgarCik(company: string): Promise<{ cik: string; name: string } | null> {
  try {
    const url = `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(company)}%22&dateRange=custom&startdt=2022-01-01&forms=10-K,10-Q`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Onlu/1.0 research@onluintel.com" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { hits?: { hits?: Array<{ _source?: { entity_name?: string; ciks?: string[] } }> } };
    const hit = data?.hits?.hits?.[0]?._source;
    if (!hit?.ciks?.[0]) return null;
    const cik = String(parseInt(hit.ciks[0], 10));
    return { cik, name: hit.entity_name ?? company };
  } catch {
    return null;
  }
}

// ─── Claude Haiku cap structure snapshot ─────────────────────────────────────

async function generateSnapshot(
  company: string,
  bonds: BondQuote[],
  edgarUrl: string | null,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return `Capital structure data unavailable — API not configured.`;

  const bondContext = bonds.length > 0
    ? bonds.map(b =>
        `${b.description || b.cusip}${b.lastPrice != null ? ` @ ${b.lastPrice.toFixed(1)}¢` : ""}${b.lastYield != null ? ` / YTM ${b.lastYield.toFixed(1)}%` : ""}${b.maturity ? ` (matures ${b.maturity})` : ""}`
      ).join("\n")
    : "No FINRA TRACE bond quotes found.";

  try {
    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 350,
      messages: [{
        role: "user",
        content: `Company: ${company}
FINRA TRACE bond quotes:
${bondContext}

Write a concise credit analyst summary (4-6 sentences) covering:
1. Business description and credit profile (what they do, why they have debt)
2. Capital structure overview (approximate total debt, key tranches — TLB, senior notes, revolver if known)
3. Key leverage metrics (Total Debt/EBITDA estimate if publicly known, interest coverage)
4. What the bond prices signal (distressed, stable, improving?)
5. Key credit risks to watch

Use precise financial language. If exact figures aren't confirmed, say "approximately" or "estimated". No bullet points — flowing analytical prose.`,
      }],
    });
    const block = msg.content[0];
    return block.type === "text" ? block.text.trim() : "Snapshot unavailable.";
  } catch {
    return "Snapshot unavailable — AI service error.";
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const company = req.nextUrl.searchParams.get("company")?.trim();
  if (!company || company.length < 2) {
    return NextResponse.json({ error: "company param required" }, { status: 400 });
  }

  const key = company.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  // Parallel: FINRA + EDGAR
  const [bonds, edgarHit] = await Promise.all([
    fetchFinraBonds(company),
    fetchEdgarCik(company),
  ]);

  const edgarUrl = edgarHit
    ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${edgarHit.cik}&type=10-K&dateb=&owner=include&count=10`
    : null;

  const snapshot = await generateSnapshot(company, bonds, edgarUrl);

  const result: CreditWatchResult = {
    company,
    bonds,
    edgarUrl,
    snapshot,
    disclaimer: "Prices from FINRA TRACE. Not investment advice.",
  };

  cache.set(key, { data: result, ts: Date.now() });
  return NextResponse.json(result);
}
