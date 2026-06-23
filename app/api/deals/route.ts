export const runtime = "nodejs";

import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";

export interface DealCard {
  id: string;
  company: string;
  counterparty?: string;
  dealType: "ma" | "ipo" | "debt";
  dealSize?: string;
  sector?: string;
  valuationNote: string;
  valuationSource: "reported" | "watch";
  summary: string;
  keyTakeaway: string;
}

export interface DealsAnalysis {
  deals: DealCard[];
  date: string;
  generatedAt: string;
}

interface RssItem { title: string; description: string; }

async function fetchItems(query: string, count = 6): Promise<RssItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const xml = await res.text();
    const items: RssItem[] = [];
    for (const block of [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, count)) {
      const body = block[1];
      const titleMatch = body.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || body.match(/<title>(.*?)<\/title>/);
      const descMatch  = body.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || body.match(/<description>(.*?)<\/description>/);
      const title = titleMatch?.[1]?.trim() ?? "";
      const description = descMatch?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400) ?? "";
      if (title) items.push({ title, description });
    }
    return items;
  } catch {
    return [];
  }
}

function formatItems(label: string, items: RssItem[]): string {
  if (!items.length) return `${label}: none`;
  return `${label}:\n` + items.map((it, i) =>
    `  ${i + 1}. ${it.title}${it.description ? `\n     Context: ${it.description}` : ""}`
  ).join("\n");
}

async function buildDeals(dateStr: string): Promise<DealsAnalysis> {
  const [maItems, ipoItems, debtItems] = await Promise.all([
    fetchItems("major merger acquisition billion deal announced 2026", 6),
    fetchItems("IPO billion valuation initial public offering 2026", 6),
    fetchItems("billion bond offering leveraged loan high-yield debt issuance 2026", 6),
  ]);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing API key");

  const input = [
    formatItems("M&A", maItems),
    formatItems("IPO", ipoItems),
    formatItems("DEBT ISSUANCE", debtItems),
  ].join("\n\n");

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are a senior buy-side analyst. Date: ${dateStr}.

Select and analyze only MAJOR deals (minimum ~$500M deal size or clearly significant). Exclude small, minor, or unclear transactions.

NEWS ITEMS (title + context):
${input}

VALUATION RULES — very important:
1. If deal terms (size, multiple, premium, yield, spread) are EXPLICITLY stated in the headlines or context: report those exact figures. Set valuationSource = "reported".
2. If terms are NOT in the news: do NOT fabricate specific multiples or valuations. Instead explain what metrics analysts will watch when terms emerge (e.g. "Terms not yet disclosed. Analysts will focus on EV/EBITDA vs. sector comps and premium to unaffected share price"). Set valuationSource = "watch".
3. NEVER invent specific numbers (like "12x EV/EBITDA" or "$4.2bn") that are not in the source material.

Return ONLY valid JSON:
{
  "deals": [
    {
      "id": "unique-slug",
      "company": "Target or issuer name",
      "counterparty": "Acquirer or lead bank (only if mentioned)",
      "dealType": "ma|ipo|debt",
      "dealSize": "Only if explicitly stated in the news — otherwise omit",
      "sector": "sector",
      "valuationNote": "If reported: exact figures from the news. If not: what metrics analysts will track and why this deal matters structurally.",
      "valuationSource": "reported|watch",
      "summary": "2 sentences: what happened and why it matters",
      "keyTakeaway": "1 sentence: what this signals for the broader market or sector"
    }
  ]
}

Include 4–6 deals. Only major transactions. No small deals.`,
      },
    ],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text
    .replace(/```json\n?|\n?```/g, "")
    .trim();
  const json = JSON.parse(raw);
  return {
    deals: (json.deals || []).slice(0, 6),
    date: dateStr,
    generatedAt: new Date().toISOString(),
  };
}

const getCachedDeals = unstable_cache(buildDeals, ["deals"], { revalidate: 21600 }); // 6h

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing API key" }, { status: 500 });

  const dateStr = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  try {
    const result = await getCachedDeals(dateStr);
    return Response.json(result, {
      headers: { "Cache-Control": "s-maxage=21600, stale-while-revalidate=3600" },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
