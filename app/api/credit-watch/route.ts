/**
 * Credit Watch API
 *
 * Given a company name, returns:
 *   1. Yahoo Finance: equity price + 30-day sparkline + key financials (public companies)
 *   2. FINRA TRACE: corporate bond prices (best-effort, may be empty)
 *   3. Claude Haiku: full cap structure analysis including estimated debt tranches,
 *      leverage, and credit risk — grounded in training knowledge + any live data
 *
 * Cached per company for 1 hour.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// cache-bust 1775663000

export interface BondQuote {
  description: string;
  lastPrice: number | null;
  lastYield: number | null;
  coupon: number | null;
  maturity: string | null;
  rating: string | null;
}

export interface EquityData {
  ticker: string;
  name: string;
  price: number | null;
  changePct: number | null;
  marketCap: number | null;
  closes: number[];
}

export interface Financials {
  totalDebt: number | null;
  ebitda: number | null;
  enterpriseValue: number | null;
  leverage: number | null;
  interestCoverage: number | null;
}

export interface DebtTranche {
  name: string;         // e.g. "Term Loan B", "8.5% Senior Notes 2027"
  amount: string;       // e.g. "$2.1B"
  seniority: number;    // 1 = most senior
  priceHint: string;    // e.g. "~85¢", "par", "distressed"
  color: string;        // tailwind bg color class
}

export interface CreditWatchResult {
  company: string;
  isPublic: boolean;
  bonds: BondQuote[];
  equity: EquityData | null;
  financials: Financials | null;
  tranches: DebtTranche[];     // AI-generated cap structure
  snapshot: string;
  disclaimer: string;
}

const cache = new Map<string, { data: CreditWatchResult; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000;

// ─── Yahoo Finance ────────────────────────────────────────────────────────────

async function searchYFTicker(company: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://yahoo-finance-real-time1.p.rapidapi.com/auto-complete?q=${encodeURIComponent(company)}&region=US`,
      { headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "yahoo-finance-real-time1.p.rapidapi.com" }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json() as { quotes?: Array<{ symbol?: string; quoteType?: string; score?: number }> };
    const hit = data?.quotes?.find(q => q.quoteType === "EQUITY") ?? data?.quotes?.[0];
    return hit?.symbol ?? null;
  } catch { return null; }
}

async function fetchYFData(ticker: string, apiKey: string): Promise<{ equity: EquityData; financials: Financials } | null> {
  try {
    const h = { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "yahoo-finance-real-time1.p.rapidapi.com" };
    const [quoteRes, chartRes, summaryRes] = await Promise.all([
      fetch(`https://yahoo-finance-real-time1.p.rapidapi.com/market/get-quotes?symbols=${ticker}&region=US&lang=en-US`, { headers: h, signal: AbortSignal.timeout(6000) }),
      fetch(`https://yahoo-finance-real-time1.p.rapidapi.com/stock/get-chart?symbol=${ticker}&interval=1d&range=1mo&region=US&includePrePost=false`, { headers: h, signal: AbortSignal.timeout(6000) }),
      fetch(`https://yahoo-finance-real-time1.p.rapidapi.com/stock/get-summary?symbol=${ticker}&region=US`, { headers: h, signal: AbortSignal.timeout(6000) }),
    ]);

    type QResp = { quoteResponse?: { result?: Array<{ shortName?: string; regularMarketPrice?: number; regularMarketChangePercent?: number; marketCap?: number }> } };
    type CResp = { chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> } };
    type SResp = { financialData?: { totalDebt?: { raw?: number }; ebitda?: { raw?: number }; interestExpense?: { raw?: number } }; defaultKeyStatistics?: { enterpriseValue?: { raw?: number } } };

    const qd = quoteRes.ok ? await quoteRes.json() as QResp : null;
    const cd = chartRes.ok  ? await chartRes.json() as CResp  : null;
    const sd = summaryRes.ok ? await summaryRes.json() as SResp : null;

    const q  = qd?.quoteResponse?.result?.[0];
    const fd = sd?.financialData;
    const ks = sd?.defaultKeyStatistics;

    const closes = (cd?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter((c): c is number => c != null);
    const totalDebt = fd?.totalDebt?.raw ?? null;
    const ebitda    = fd?.ebitda?.raw    ?? null;
    const intExp    = fd?.interestExpense?.raw ? Math.abs(fd.interestExpense.raw) : null;

    return {
      equity: {
        ticker,
        name:      q?.shortName ?? ticker,
        price:     q?.regularMarketPrice ?? null,
        changePct: q?.regularMarketChangePercent ?? null,
        marketCap: q?.marketCap ?? null,
        closes,
      },
      financials: {
        totalDebt,
        ebitda,
        enterpriseValue: ks?.enterpriseValue?.raw ?? null,
        leverage:        totalDebt && ebitda && ebitda > 0 ? totalDebt / ebitda : null,
        interestCoverage: ebitda && intExp && intExp > 0 ? ebitda / intExp : null,
      },
    };
  } catch { return null; }
}

// ─── FINRA TRACE (best-effort) ────────────────────────────────────────────────

async function fetchFinraBonds(company: string): Promise<BondQuote[]> {
  // Multiple search strategies
  const queries = [company, company.split(" ")[0]];
  for (const q of queries) {
    try {
      const url = `https://services.finra.org/apps/marketdata/fixed-income/otc/search?symbol=${encodeURIComponent(q)}&sortfield=lastTradeDate&sorttype=1`;
      const res = await fetch(url, { headers: { "User-Agent": "Onlu/1.0 research@onluintel.com" }, signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const data = await res.json() as Array<Record<string, unknown>>;
      if (!Array.isArray(data) || data.length === 0) continue;
      return data.slice(0, 6).map(b => ({
        description: String(b.issueDesc ?? b.securityDescription ?? b.description ?? ""),
        lastPrice:   b.lastPrice  != null ? Number(b.lastPrice)  : null,
        lastYield:   b.lastYield  != null ? Number(b.lastYield)  : null,
        coupon:      b.coupon     != null ? Number(b.coupon)     : null,
        maturity:    b.maturityDate != null ? String(b.maturityDate) : null,
        rating:      String(b.moodysRating ?? b.spRating ?? b.fitchRating ?? ""),
      })).filter(b => b.description);
    } catch { continue; }
  }
  return [];
}

// ─── Claude Haiku: full analysis + cap structure ──────────────────────────────

async function generateAnalysis(
  company: string,
  fin: Financials | null,
  bonds: BondQuote[],
  isPublic: boolean,
): Promise<{ snapshot: string; tranches: DebtTranche[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { snapshot: "API not configured.", tranches: [] };

  const finCtx = fin ? [
    fin.totalDebt    != null ? `Total Debt $${(fin.totalDebt / 1e9).toFixed(2)}B`            : null,
    fin.ebitda       != null ? `EBITDA $${(fin.ebitda / 1e9).toFixed(2)}B`                   : null,
    fin.leverage     != null ? `Leverage ${fin.leverage.toFixed(1)}x`                         : null,
    fin.interestCoverage != null ? `Int Coverage ${fin.interestCoverage.toFixed(1)}x`        : null,
    fin.enterpriseValue  != null ? `EV $${(fin.enterpriseValue / 1e9).toFixed(2)}B`          : null,
  ].filter(Boolean).join(" · ") : "No live financial data (private/unlisted company).";

  const bondCtx = bonds.length > 0
    ? bonds.map(b => `${b.description}${b.lastPrice != null ? ` @ ${b.lastPrice.toFixed(1)}¢` : ""}${b.lastYield != null ? ` / YTM ${b.lastYield.toFixed(1)}%` : ""}`).join("\n")
    : "No live bond prices available.";

  try {
    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{
        role: "user",
        content: `You are a senior credit analyst. Company: "${company}"
Live financials: ${finCtx}
FINRA bond quotes: ${bondCtx}
Public: ${isPublic}

Return JSON with exactly these two keys:
{
  "snapshot": "4-5 sentence credit analyst summary covering: business & debt rationale, cap structure (specific tranches with approximate sizes), leverage assessment, credit risks. Be specific about the actual debt instruments this company has. If private/unlisted, use training knowledge. No hedging phrases.",
  "tranches": [
    { "name": "Revolving Credit Facility", "amount": "$500M", "seniority": 1, "priceHint": "par", "color": "bg-emerald-500" },
    { "name": "Term Loan B", "amount": "$2.1B", "seniority": 2, "priceHint": "~94¢", "color": "bg-blue-500" },
    { "name": "8.5% Senior Notes 2027", "amount": "$1.5B", "seniority": 3, "priceHint": "~78¢", "color": "bg-amber-500" }
  ]
}

Use colors: bg-emerald-500 (senior secured), bg-blue-500 (TLB/TLA), bg-violet-500 (second lien), bg-amber-500 (senior unsecured notes), bg-red-500 (sub/PIK). Return only valid JSON.`,
      }],
    });

    const block = msg.content[0];
    if (block.type !== "text") return { snapshot: "Unavailable.", tranches: [] };

    const text = block.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { snapshot: text, tranches: [] };

    const parsed = JSON.parse(jsonMatch[0]) as { snapshot?: string; tranches?: DebtTranche[] };
    return {
      snapshot: parsed.snapshot ?? text,
      tranches: Array.isArray(parsed.tranches) ? parsed.tranches : [],
    };
  } catch {
    return { snapshot: "Analysis unavailable.", tranches: [] };
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

  const rapidApiKey = process.env.RAPIDAPI_KEY ?? "";

  // Parallel: FINRA + YF ticker lookup
  const [bonds, ticker] = await Promise.all([
    fetchFinraBonds(company),
    rapidApiKey ? searchYFTicker(company, rapidApiKey) : Promise.resolve(null),
  ]);

  const yfData = ticker && rapidApiKey ? await fetchYFData(ticker, rapidApiKey) : null;
  const isPublic = !!yfData?.equity?.price;

  const { snapshot, tranches } = await generateAnalysis(company, yfData?.financials ?? null, bonds, isPublic);

  const result: CreditWatchResult = {
    company,
    isPublic,
    bonds,
    equity:     yfData?.equity     ?? null,
    financials: yfData?.financials ?? null,
    tranches,
    snapshot,
    disclaimer: "Financials: Yahoo Finance. Bond prices: FINRA TRACE (best-effort). Cap structure: AI-estimated. Not investment advice.",
  };

  cache.set(key, { data: result, ts: Date.now() });
  return NextResponse.json(result);
}
