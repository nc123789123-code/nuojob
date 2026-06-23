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
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are extracting deal information ONLY from the news snippets below. Date: ${dateStr}.

STRICT RULES:
- Use ONLY information explicitly stated in the provided headlines and context snippets. Do NOT use your training knowledge to fill in details, add context, or infer facts not present in the text.
- If a deal's size, terms, or valuation are not mentioned in the text, do not guess them.
- If you are not certain a deal is real and current from the text alone, skip it.
- Only include significant deals (clearly $500M+ or described as major). Skip small, speculative, or vague items.
- For dealSize: only include if an explicit dollar figure appears in the text.
- For valuationNote: if terms are in the text, quote them. If not, say "Terms not yet disclosed — watch for [relevant metric e.g. EV/EBITDA, deal premium, yield spread] when announced." Set valuationSource = "watch".

NEWS ITEMS:
${input}

Return ONLY valid JSON, no markdown:
{
  "deals": [
    {
      "id": "slug",
      "company": "company name from the text",
      "counterparty": "only if named in the text",
      "dealType": "ma|ipo|debt",
      "dealSize": "only if explicitly in the text",
      "sector": "sector if inferable from company name",
      "valuationNote": "reported terms from text, or 'Terms not yet disclosed — watch for X'",
      "valuationSource": "reported|watch",
      "summary": "2 sentences based only on what the text says",
      "keyTakeaway": "1 sentence market implication"
    }
  ]
}

Return an empty deals array if no clearly major, real deals are identifiable from the text.`,
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

const getCachedDeals = unstable_cache(buildDeals, ["deals-v4"], { revalidate: 21600 }); // 6h

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
