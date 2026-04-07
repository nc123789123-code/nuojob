/**
 * 30-day daily close history for key market symbols via Yahoo Finance RapidAPI
 * Returns sparkline-ready arrays of closing prices.
 * Cached 1 hour — daily candles don't need more frequent refreshes.
 */
export const runtime = "nodejs";

export interface SymbolHistory {
  symbol: string;
  label: string;
  isYield: boolean;
  closes: number[];        // daily closes, oldest → newest
  timestamps: number[];    // unix seconds
  change30d: number;       // % change over the period
}

const SYMBOLS = [
  { symbol: "^GSPC",    label: "S&P 500",   isYield: false },
  { symbol: "QQQ",      label: "QQQ",        isYield: false },
  { symbol: "^TNX",     label: "10Y Yield",  isYield: true  },
  { symbol: "CL=F",     label: "WTI",        isYield: false },
  { symbol: "GC=F",     label: "Gold",       isYield: false },
  { symbol: "^VIX",     label: "VIX",        isYield: false },
];

let cache: { data: SymbolHistory[]; ts: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface YFChartResult {
  timestamp?: number[];
  indicators?: {
    quote?: Array<{ close?: (number | null)[] }>;
  };
}
interface YFChartResp {
  chart?: { result?: YFChartResult[]; error?: unknown };
}

async function fetchSymbol(symbol: string, apiKey: string): Promise<YFChartResult | null> {
  const p = new URLSearchParams({
    interval: "1d",
    symbol,
    range: "1mo",
    region: "US",
    includePrePost: "false",
  });
  try {
    const res = await fetch(
      `https://yahoo-finance-real-time1.p.rapidapi.com/stock/get-chart?${p}`,
      {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "yahoo-finance-real-time1.p.rapidapi.com",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json() as YFChartResp;
    return data?.chart?.result?.[0] ?? null;
  } catch { return null; }
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return Response.json(cache.data);
  }

  const apiKey = process.env.RAPIDAPI_KEY ?? "";
  if (!apiKey) return Response.json([]);

  const results = await Promise.allSettled(
    SYMBOLS.map(s => fetchSymbol(s.symbol, apiKey))
  );

  const data: SymbolHistory[] = [];

  for (let i = 0; i < SYMBOLS.length; i++) {
    const r = results[i];
    const meta = SYMBOLS[i];
    if (r.status !== "fulfilled" || !r.value) continue;

    const raw = r.value;
    const timestamps = raw.timestamp ?? [];
    const rawCloses = raw.indicators?.quote?.[0]?.close ?? [];

    // Filter out nulls, keep paired timestamps
    const closes: number[] = [];
    const ts: number[] = [];
    for (let j = 0; j < rawCloses.length; j++) {
      const c = rawCloses[j];
      if (c != null && !isNaN(c)) {
        closes.push(c);
        ts.push(timestamps[j] ?? 0);
      }
    }
    if (closes.length < 2) continue;

    const first = closes[0];
    const last = closes[closes.length - 1];
    const change30d = ((last - first) / first) * 100;

    data.push({ symbol: meta.symbol, label: meta.label, isYield: meta.isYield, closes, timestamps: ts, change30d });
  }

  cache = { data, ts: Date.now() };
  return Response.json(data);
}
