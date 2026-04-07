/**
 * Credit Watch API
 *
 * Given a company name, returns:
 *   1. Bond/loan prices from FINRA TRACE OTC bond search
 *   2. Yahoo Finance: ticker lookup, 30-day stock history, key financials
 *      (Total Debt, EBITDA, Enterprise Value, Market Cap)
 *   3. SEC EDGAR filing reference
 *   4. Claude Haiku cap structure + leverage snapshot
 *
 * Cached per company for 1 hour.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BondQuote {
  cusip: string;
  description: string;
  lastPrice: number | null;   // cents on the dollar
  lastYield: number | null;   // %
  lastTradeDate: string | null;
  coupon: number | null;
  maturity: string | null;
  rating: string | null;
}

export interface EquityData {
  ticker: string;
  name: string;
  price: number | null;
  changePct: number | null;
  marketCap: number | null;    // USD
  closes: number[];            // 30-day daily closes for sparkline
}

export interface Financials {
  totalDebt: number | null;    // USD
  ebitda: number | null;       // USD
  enterpriseValue: number | null;
  leverage: number | null;     // Total Debt / EBITDA
  interestCoverage: number | null;
}

export interface CreditWatchResult {
  company: string;
  bonds: BondQuote[];
  equity: EquityData | null;
  financials: Financials | null;
  edgarUrl: string | null;
  snapshot: string;
  disclaimer: string;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const cache = new Map<string, { data: CreditWatchResult; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000;

// ─── FINRA TRACE ──────────────────────────────────────────────────────────────

async function fetchFinraBonds(company: string): Promise<BondQuote[]> {
  try {
    const url = `https://services.finra.org/apps/marketdata/fixed-income/otc/search?symbol=${encodeURIComponent(company)}&sortfield=lastTradeDate&sorttype=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Onlu/1.0 research@onluintel.com" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json() as Array<Record<string, unknown>>;
    if (!Array.isArray(data)) return [];
    return data.slice(0, 8).map((b) => ({
      cusip:         String(b.cusip ?? b.CUSIP ?? ""),
      description:   String(b.issueDesc ?? b.description ?? b.securityDescription ?? ""),
      lastPrice:     b.lastPrice    != null ? Number(b.lastPrice)    : null,
      lastYield:     b.lastYield    != null ? Number(b.lastYield)    : null,
      lastTradeDate: b.lastTradeDate != null ? String(b.lastTradeDate) : null,
      coupon:        b.coupon       != null ? Number(b.coupon)       : null,
      maturity:      b.maturityDate != null ? String(b.maturityDate) : null,
      rating:        String(b.moodysRating ?? b.spRating ?? b.fitchRating ?? ""),
    })).filter(b => b.description || b.cusip);
  } catch { return []; }
}

// ─── Yahoo Finance ────────────────────────────────────────────────────────────

async function searchYFTicker(company: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://yahoo-finance-real-time1.p.rapidapi.com/auto-complete?q=${encodeURIComponent(company)}&region=US`,
      { headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "yahoo-finance-real-time1.p.rapidapi.com" }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json() as { quotes?: Array<{ symbol?: string; shortname?: string; quoteType?: string }> };
    // Prefer EQUITY type, first result
    const hit = data?.quotes?.find(q => q.quoteType === "EQUITY") ?? data?.quotes?.[0];
    return hit?.symbol ?? null;
  } catch { return null; }
}

async function fetchYFQuoteAndHistory(ticker: string, apiKey: string): Promise<{ equity: EquityData; financials: Financials } | null> {
  try {
    const headers = { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "yahoo-finance-real-time1.p.rapidapi.com" };

    // Parallel: quote + chart + summary stats
    const [quoteRes, chartRes, summaryRes] = await Promise.all([
      fetch(`https://yahoo-finance-real-time1.p.rapidapi.com/market/get-quotes?symbols=${ticker}&region=US&lang=en-US`, { headers, signal: AbortSignal.timeout(6000) }),
      fetch(`https://yahoo-finance-real-time1.p.rapidapi.com/stock/get-chart?symbol=${ticker}&interval=1d&range=1mo&region=US&includePrePost=false`, { headers, signal: AbortSignal.timeout(6000) }),
      fetch(`https://yahoo-finance-real-time1.p.rapidapi.com/stock/get-summary?symbol=${ticker}&region=US`, { headers, signal: AbortSignal.timeout(6000) }),
    ]);

    // Quote
    const quoteData = quoteRes.ok ? await quoteRes.json() as { quoteResponse?: { result?: Array<{ shortName?: string; regularMarketPrice?: number; regularMarketChangePercent?: number; marketCap?: number }> } } : null;
    const q = quoteData?.quoteResponse?.result?.[0];

    // Chart — 30-day closes
    const chartData = chartRes.ok ? await chartRes.json() as { chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> } } : null;
    const rawCloses = chartData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const closes = rawCloses.filter((c): c is number => c != null);

    // Summary — financials
    type SummaryData = { financialData?: { totalDebt?: { raw?: number }; ebitda?: { raw?: number }; operatingCashflow?: { raw?: number }; interestExpense?: { raw?: number } }; defaultKeyStatistics?: { enterpriseValue?: { raw?: number } } };
    const summaryData: SummaryData = summaryRes.ok ? await summaryRes.json() as SummaryData : {};
    const fd = summaryData?.financialData;
    const ks = summaryData?.defaultKeyStatistics;

    const totalDebt = fd?.totalDebt?.raw ?? null;
    const ebitda    = fd?.ebitda?.raw    ?? null;
    const ev        = ks?.enterpriseValue?.raw ?? null;
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
        enterpriseValue: ev,
        leverage:        totalDebt && ebitda && ebitda > 0 ? totalDebt / ebitda : null,
        interestCoverage: ebitda && intExp && intExp > 0 ? ebitda / intExp : null,
      },
    };
  } catch { return null; }
}

// ─── SEC EDGAR ────────────────────────────────────────────────────────────────

async function fetchEdgarCik(company: string): Promise<{ cik: string } | null> {
  try {
    const url = `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(company)}%22&dateRange=custom&startdt=2022-01-01&forms=10-K,10-Q`;
    const res = await fetch(url, { headers: { "User-Agent": "Onlu/1.0 research@onluintel.com" }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json() as { hits?: { hits?: Array<{ _source?: { ciks?: string[] } }> } };
    const cik = data?.hits?.hits?.[0]?._source?.ciks?.[0];
    if (!cik) return null;
    return { cik: String(parseInt(cik, 10)) };
  } catch { return null; }
}

// ─── Claude Haiku snapshot ────────────────────────────────────────────────────

async function generateSnapshot(company: string, bonds: BondQuote[], fin: Financials | null): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "Capital structure data unavailable.";

  const bondCtx = bonds.length > 0
    ? bonds.map(b => `${b.description || b.cusip}${b.lastPrice != null ? ` @ ${b.lastPrice.toFixed(1)}¢` : ""}${b.lastYield != null ? ` / YTM ${b.lastYield.toFixed(1)}%` : ""}${b.maturity ? ` (matures ${b.maturity})` : ""}`).join("\n")
    : "No FINRA bond quotes found.";

  const finCtx = fin ? [
    fin.totalDebt    != null ? `Total Debt: $${(fin.totalDebt / 1e9).toFixed(2)}B`          : null,
    fin.ebitda       != null ? `EBITDA: $${(fin.ebitda / 1e9).toFixed(2)}B`                 : null,
    fin.leverage     != null ? `Leverage: ${fin.leverage.toFixed(1)}x`                       : null,
    fin.interestCoverage != null ? `Interest Coverage: ${fin.interestCoverage.toFixed(1)}x` : null,
    fin.enterpriseValue  != null ? `EV: $${(fin.enterpriseValue / 1e9).toFixed(2)}B`        : null,
  ].filter(Boolean).join(" · ") : "No Yahoo Finance data.";

  try {
    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `Company: ${company}
Financials: ${finCtx}
FINRA TRACE bonds:
${bondCtx}

Write 4-5 sentences as a senior credit analyst covering: business & debt rationale, cap structure (TLB/senior notes/revolver), leverage & coverage assessment, what bond prices signal, and the #1 credit risk. Precise language, no bullets, no hedging phrases like "it's worth noting".`,
      }],
    });
    const block = msg.content[0];
    return block.type === "text" ? block.text.trim() : "Snapshot unavailable.";
  } catch { return "Snapshot unavailable."; }
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

  // Parallel: FINRA + EDGAR + YF ticker lookup
  const [bonds, edgarHit, ticker] = await Promise.all([
    fetchFinraBonds(company),
    fetchEdgarCik(company),
    rapidApiKey ? searchYFTicker(company, rapidApiKey) : Promise.resolve(null),
  ]);

  // Fetch YF quote + history + financials if ticker found
  const yfData = ticker && rapidApiKey ? await fetchYFQuoteAndHistory(ticker, rapidApiKey) : null;

  const edgarUrl = edgarHit
    ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${edgarHit.cik}&type=10-K&dateb=&owner=include&count=10`
    : null;

  const snapshot = await generateSnapshot(company, bonds, yfData?.financials ?? null);

  const result: CreditWatchResult = {
    company,
    bonds,
    equity:     yfData?.equity     ?? null,
    financials: yfData?.financials ?? null,
    edgarUrl,
    snapshot,
    disclaimer: "Bond prices: FINRA TRACE. Financials: Yahoo Finance. Not investment advice.",
  };

  cache.set(key, { data: result, ts: Date.now() });
  return NextResponse.json(result);
}
