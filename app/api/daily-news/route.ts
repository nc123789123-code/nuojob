export const runtime = "nodejs";

import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  category: "markets" | "economy" | "banking" | "companies" | "policy" | "global";
  takeaway: string;
}

export interface NewsResponse {
  items: NewsItem[];
  generatedAt: string;
}

interface RssItem { title: string; description: string; }

async function fetchRss(query: string, count = 4): Promise<RssItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const xml = await res.text();
    const items: RssItem[] = [];
    for (const block of [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, count)) {
      const body = block[1];
      const titleM = body.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || body.match(/<title>(.*?)<\/title>/);
      const descM  = body.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || body.match(/<description>(.*?)<\/description>/);
      const title = titleM?.[1]?.trim() ?? "";
      const description = descM?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300) ?? "";
      if (title) items.push({ title, description });
    }
    return items;
  } catch {
    return [];
  }
}

async function buildNews(): Promise<NewsResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing API key");

  const [markets, economy, banking, companies, policy, global] = await Promise.all([
    fetchRss("stock market Wall Street S&P Nasdaq today", 4),
    fetchRss("US economy inflation GDP jobs Federal Reserve today", 4),
    fetchRss("bank lending credit finance today", 3),
    fetchRss("earnings merger acquisition corporate deal today", 4),
    fetchRss("Treasury regulation SEC finance policy today", 3),
    fetchRss("global finance China Europe emerging markets today", 3),
  ]);

  const allRaw = [
    ...markets, ...economy, ...banking, ...companies, ...policy, ...global,
  ];

  const input = allRaw.map((it, i) =>
    `[${i}] ${it.title}${it.description ? ` — ${it.description}` : ""}`
  ).join("\n");

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1400,
    messages: [{
      role: "user",
      content: `You are a financial news editor. From the headlines below, pick the 8 most newsworthy, non-duplicate stories. Rewrite each as a clean headline and add a 1-sentence takeaway for a finance professional.

HEADLINES:
${input}

Return ONLY valid JSON — no markdown:
{"items":[{"id":"unique-slug","headline":"Clean rewritten headline","source":"Publication name from the title suffix","category":"markets|economy|banking|companies|policy|global","takeaway":"One sentence on why this matters to finance pros."}]}

Deduplicate aggressively. Prefer concrete, market-moving stories over opinion or fluff.`,
    }],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text
    .replace(/```json\n?|\n?```/g, "").trim();
  const json = JSON.parse(raw);
  return { items: (json.items ?? []).slice(0, 8), generatedAt: new Date().toISOString() };
}

const getCachedNews = unstable_cache(buildNews, ["daily-news-v1"], { revalidate: 7200 }); // 2h

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing API key" }, { status: 500 });

  try {
    const result = await getCachedNews();
    return Response.json(result, {
      headers: { "Cache-Control": "s-maxage=7200, stale-while-revalidate=900" },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
