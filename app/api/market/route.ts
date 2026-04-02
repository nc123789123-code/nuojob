export const runtime = "nodejs";

import Anthropic from "@anthropic-ai/sdk";

let cache: { data: MarketAnalysis; ts: number } | null = null;
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

export interface MarketSection {
  title: string;
  summary: string;
  bullets: string[];
  sentiment: "positive" | "negative" | "neutral" | "mixed";
}

export interface MarketAnalysis {
  session: "morning" | "evening";
  date: string;
  headline: string;
  sections: MarketSection[];
  generatedAt: string;
}

async function fetchHeadlines(query: string): Promise<string[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const xml = await res.text();
    const cdata = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)]
      .slice(1, 5)
      .map((m) => m[1].trim());
    if (cdata.length > 0) return cdata;
    return [...xml.matchAll(/<title>(.*?)<\/title>/g)]
      .slice(1, 5)
      .map((m) => m[1].trim());
  } catch {
    return [];
  }
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) {
    return Response.json(cache.data);
  }

  const [usEquity, fixedIncome, international, macro, alternatives] =
    await Promise.all([
      fetchHeadlines("US stock market S&P 500 Nasdaq today"),
      fetchHeadlines("US Treasury bond yield fixed income today"),
      fetchHeadlines("international markets Europe Asia equities today"),
      fetchHeadlines("Federal Reserve inflation GDP macro economy today"),
      fetchHeadlines("private equity credit hedge fund alternatives today"),
    ]);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing API key" }, { status: 500 });

  const etHour = parseInt(
    new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    })
  );
  const session: "morning" | "evening" = etHour >= 16 ? "evening" : "morning";
  const dateStr = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const headlines = `
U.S. EQUITY: ${usEquity.join(" | ") || "unavailable"}
FIXED INCOME: ${fixedIncome.join(" | ") || "unavailable"}
INTERNATIONAL: ${international.join(" | ") || "unavailable"}
MACRO / FED: ${macro.join(" | ") || "unavailable"}
ALTERNATIVES: ${alternatives.join(" | ") || "unavailable"}`.trim();

  const client = new Anthropic({ apiKey });

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: `You are a senior buy-side analyst writing a ${session === "morning" ? "pre-market morning" : "post-close evening"} brief for institutional investors (private credit, special situations, alternatives).

Today: ${dateStr}
Headlines: ${headlines}

Return ONLY a JSON object:
{
  "headline": "one sharp sentence summarizing the top market theme today",
  "sections": [
    { "title": "U.S. Equity", "summary": "2-3 sentences", "bullets": ["point","point","point"], "sentiment": "positive|negative|neutral|mixed" },
    { "title": "Fixed Income", "summary": "...", "bullets": [...], "sentiment": "..." },
    { "title": "International", "summary": "...", "bullets": [...], "sentiment": "..." },
    { "title": "Macro & Fed", "summary": "...", "bullets": [...], "sentiment": "..." },
    { "title": "Alternatives & Private Markets", "summary": "...", "bullets": [...], "sentiment": "..." }
  ]
}

Be precise and analytical. No filler. Return only the JSON.`,
      },
    ],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text
    .replace(/```json\n?|\n?```/g, "")
    .trim();

  const json = JSON.parse(raw);

  const result: MarketAnalysis = {
    session,
    date: dateStr,
    headline: json.headline,
    sections: json.sections,
    generatedAt: new Date().toISOString(),
  };

  cache = { data: result, ts: now };
  return Response.json(result);
}
