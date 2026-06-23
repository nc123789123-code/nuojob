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
  summary: string;
  keyTakeaway: string;
}

export interface DealsAnalysis {
  deals: DealCard[];
  date: string;
  generatedAt: string;
}

async function fetchHeadlines(query: string, count = 5): Promise<string[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const xml = await res.text();
    const cdata = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)]
      .slice(1, count + 1)
      .map((m) => m[1].trim());
    if (cdata.length > 0) return cdata;
    return [...xml.matchAll(/<title>(.*?)<\/title>/g)]
      .slice(1, count + 1)
      .map((m) => m[1].trim());
  } catch {
    return [];
  }
}

async function buildDeals(dateStr: string): Promise<DealsAnalysis> {
  const [maHeadlines, ipoHeadlines, debtHeadlines] = await Promise.all([
    fetchHeadlines("merger acquisition deal signed 2026", 5),
    fetchHeadlines("IPO initial public offering S-1 filing 2026", 5),
    fetchHeadlines("bond offering leveraged loan debt issuance high yield 2026", 5),
  ]);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing API key");

  const headlines = [
    `M&A: ${maHeadlines.join(" | ") || "none"}`,
    `IPO: ${ipoHeadlines.join(" | ") || "none"}`,
    `DEBT: ${debtHeadlines.join(" | ") || "none"}`,
  ].join("\n");

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1600,
    messages: [
      {
        role: "user",
        content: `You are a buy-side analyst writing deal cards for junior finance professionals. Date: ${dateStr}.

Analyze these headlines and return structured deal cards with concise valuation commentary.

Headlines:
${headlines}

Return ONLY valid JSON (no markdown, no explanation):
{
  "deals": [
    {
      "id": "short-unique-slug",
      "company": "Target or issuer name",
      "counterparty": "Acquirer or lead bank (omit if unknown)",
      "dealType": "ma|ipo|debt",
      "dealSize": "$Xbn or $Xmn (omit if unknown)",
      "sector": "sector (e.g. Technology, Healthcare, Energy)",
      "valuationNote": "Specific valuation metric: for M&A include EV/EBITDA and premium to unaffected; for IPO include EV/Revenue or P/E and comparable comps; for debt include coupon, spread to Treasuries or SOFR, rating if known",
      "summary": "2 crisp sentences covering what the deal is and why it happened",
      "keyTakeaway": "1 sentence buy-side implication for a junior analyst — what does this signal about the market?"
    }
  ]
}

Include up to 6 deals (mix of types). Skip vague headlines. Only include clearly identified, real deals.`,
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
