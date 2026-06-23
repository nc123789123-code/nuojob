export const runtime = "nodejs";

import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";

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
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const xml = await res.text();
    const cdata = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)]
      .slice(1, 4)
      .map((m) => m[1].trim());
    if (cdata.length > 0) return cdata;
    return [...xml.matchAll(/<title>(.*?)<\/title>/g)]
      .slice(1, 4)
      .map((m) => m[1].trim());
  } catch {
    return [];
  }
}

async function buildBrief(session: "morning" | "evening", dateStr: string): Promise<MarketAnalysis> {
  const [usEquity, fixedIncome, macro, alternatives] = await Promise.all([
    fetchHeadlines("US stock market S&P 500 today"),
    fetchHeadlines("US Treasury bond yield today"),
    fetchHeadlines("Federal Reserve inflation macro economy today"),
    fetchHeadlines("private equity credit hedge fund alternatives today"),
  ]);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing API key");

  const headlines = [
    `US EQUITY: ${usEquity.join(" | ") || "unavailable"}`,
    `FIXED INCOME: ${fixedIncome.join(" | ") || "unavailable"}`,
    `MACRO: ${macro.join(" | ") || "unavailable"}`,
    `ALTS: ${alternatives.join(" | ") || "unavailable"}`,
  ].join("\n");

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 900,
    messages: [{
      role: "user",
      content: `Buy-side ${session === "morning" ? "pre-market" : "post-close"} brief. Date: ${dateStr}.\nHeadlines:\n${headlines}\n\nReturn ONLY JSON. Keep summaries to 1 sentence. Max 2 bullets per section, each under 10 words.\n{"headline":"one sharp sentence","sections":[{"title":"U.S. Equity","summary":"1 sentence","bullets":["short pt","short pt"],"sentiment":"positive|negative|neutral|mixed"},{"title":"Fixed Income","summary":"...","bullets":[...],"sentiment":"..."},{"title":"Macro & Fed","summary":"...","bullets":[...],"sentiment":"..."},{"title":"Alternatives","summary":"...","bullets":[...],"sentiment":"..."}]}`,
    }],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text
    .replace(/```json\n?|\n?```/g, "").trim();
  const json = JSON.parse(raw);
  return { session, date: dateStr, headline: json.headline, sections: json.sections, generatedAt: new Date().toISOString() };
}

const getCachedBrief = unstable_cache(buildBrief, ["market-v2"], { revalidate: 10800 }); // 3h

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing API key" }, { status: 500 });

  const etHour = parseInt(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false })
  );
  const session: "morning" | "evening" = etHour >= 16 ? "evening" : "morning";
  const dateStr = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  try {
    const result = await getCachedBrief(session, dateStr);
    return Response.json(result, {
      headers: { "Cache-Control": "s-maxage=10800, stale-while-revalidate=1800" },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
