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
  valuationSource: "reported" | "estimated";
  summary: string;
  keyTakeaway: string;
}

export interface DealsAnalysis {
  deals: DealCard[];
  date: string;
  generatedAt: string;
}

interface RssItem { title: string; description: string; }

async function fetchItems(query: string, count = 5): Promise<RssItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const xml = await res.text();

    // Parse <item> blocks to get both title and description
    const items: RssItem[] = [];
    const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    for (const block of itemBlocks.slice(0, count)) {
      const body = block[1];
      const titleMatch = body.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                         body.match(/<title>(.*?)<\/title>/);
      const descMatch  = body.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ||
                         body.match(/<description>(.*?)<\/description>/);
      const title = titleMatch?.[1]?.trim() ?? "";
      const description = descMatch?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300) ?? "";
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
    fetchItems("merger acquisition buyout deal announced 2026", 5),
    fetchItems("IPO initial public offering S-1 listing 2026", 5),
    fetchItems("bond offering leveraged loan debt issuance high-yield 2026", 5),
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
        content: `You are a senior buy-side analyst writing deal intelligence cards for junior analysts. Date: ${dateStr}.

CRITICAL RULE: The "valuationNote" field must ALWAYS contain specific metrics — never say "unknown" or "not disclosed".
- If the deal terms are in the headlines/context: use the reported figures.
- If terms are NOT reported: use your knowledge of typical sector multiples and recent comps to give an ESTIMATED range. Label it as estimated. For example: "Terms not disclosed; comparable software M&A trades at 15-25x EV/EBITDA — deal likely priced in that range given [rationale]."

News items (title + context snippet):
${input}

Return ONLY valid JSON:
{
  "deals": [
    {
      "id": "unique-slug",
      "company": "Target/issuer name",
      "counterparty": "Acquirer or lead underwriter",
      "dealType": "ma|ipo|debt",
      "dealSize": "$Xbn or null",
      "sector": "sector name",
      "valuationNote": "ALWAYS fill this. Reported: state exact figures (EV/EBITDA, premium to unaffected, P/E, yield, spread vs SOFR/Treasuries). Estimated: give sector comp range with reasoning.",
      "valuationSource": "reported|estimated",
      "summary": "2 crisp sentences: what happened and strategic rationale",
      "keyTakeaway": "1 sentence buy-side signal for a junior analyst"
    }
  ]
}

Rules:
- Include up to 6 deals, mix of types
- Skip genuinely unidentifiable headlines
- valuationNote is REQUIRED and must be substantive — never leave it as "terms not disclosed" alone
- For M&A: EV/EBITDA multiple + premium to unaffected share price
- For IPO: EV/Revenue or forward P/E + how it compares to sector peers
- For debt: coupon or spread (vs SOFR or Treasuries) + rating + use of proceeds context`,
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
