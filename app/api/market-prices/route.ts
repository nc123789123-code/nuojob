export const runtime = "nodejs";

interface YFQuote {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
}
interface YFResp {
  quoteResponse?: { result?: YFQuote[] };
}

export interface MarketTicker {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePct: number;
  isYield: boolean; // true for treasury yields (display as %)
}

const SYMBOLS = [
  { symbol: "^GSPC",    label: "S&P 500",   isYield: false },
  { symbol: "QQQ",      label: "QQQ",        isYield: false },
  { symbol: "IWM",      label: "Russell 2K", isYield: false },
  { symbol: "^VIX",     label: "VIX",        isYield: false },
  { symbol: "^TNX",     label: "10Y Yield",  isYield: true  },
  { symbol: "^IRX",     label: "3M Yield",   isYield: true  },
  { symbol: "DX-Y.NYB", label: "DXY",        isYield: false },
  { symbol: "CL=F",     label: "WTI",        isYield: false },
  { symbol: "GC=F",     label: "Gold",       isYield: false },
];

let cache: { data: MarketTicker[]; ts: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return Response.json(cache.data);
  }

  const apiKey = process.env.RAPIDAPI_KEY ?? "";
  if (!apiKey) return Response.json([], { status: 200 });

  const symbolList = SYMBOLS.map(s => s.symbol).join(",");

  try {
    const res = await fetch(
      `https://yahoo-finance-real-time1.p.rapidapi.com/market/get-quotes?symbols=${encodeURIComponent(symbolList)}&region=US&lang=en-US`,
      {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "yahoo-finance-real-time1.p.rapidapi.com",
        },
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!res.ok) return Response.json([], { status: 200 });

    const data = await res.json() as YFResp;
    // yahoo-finance-real-time1 may nest differently — handle both shapes
    const results: YFQuote[] = data?.quoteResponse?.result
      ?? (data as unknown as { result?: YFQuote[] })?.result
      ?? [];

    const tickers: MarketTicker[] = SYMBOLS.flatMap(({ symbol, label, isYield }) => {
      const q = results.find(r => r.symbol === symbol);
      if (!q || q.regularMarketPrice == null) return [];
      return [{
        symbol,
        label,
        price: q.regularMarketPrice,
        change: q.regularMarketChange ?? 0,
        changePct: q.regularMarketChangePercent ?? 0,
        isYield,
      }];
    });

    cache = { data: tickers, ts: Date.now() };
    return Response.json(tickers);
  } catch {
    return Response.json([], { status: 200 });
  }
}
