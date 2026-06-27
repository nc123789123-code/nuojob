export const runtime = "nodejs";

import Anthropic from "@anthropic-ai/sdk";

export interface HistoryItem {
  year: number;
  headline: string;
  detail: string;
  category: "market" | "company" | "figure" | "policy" | "crisis";
}

export interface BornToday {
  name: string;
  birthYear: number;
  role: string;
  significance: string;
}

export interface TodayHistory {
  monthDay: string;
  items: HistoryItem[];
  bornToday?: BornToday;
  generatedAt: string;
}

const FINANCE_KEYWORDS = [
  "economist", "banker", "investor", "financier", "trader", "fund",
  "hedge", "chairman", "ceo", "chief executive", "federal reserve",
  "treasury", "secretary of the treasury", "finance minister",
  "venture", "capitalist", "stockbroker", "billionaire", "business",
  "entrepreneur", "industrialist", "philanthropist", "wall street",
  "insurance", "asset manager", "private equity",
];

interface WikiBirth {
  text: string;
  year: number;
  pages: Array<{ title: string; extract?: string; description?: string }>;
}

// Module-level cache — persists within a serverless instance, one entry per calendar day
const dayCache = new Map<string, TodayHistory>();

async function fetchBornToday(month: number, day: number, client: Anthropic): Promise<BornToday | undefined> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/births/${month}/${day}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "OnluIntel/1.0 (onluintel.com)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return undefined;

    const data = await res.json() as { births?: WikiBirth[] };
    const births: WikiBirth[] = data.births ?? [];

    const candidates = births.filter(b => {
      const combined = [
        b.text,
        b.pages?.[0]?.extract ?? "",
        b.pages?.[0]?.description ?? "",
      ].join(" ").toLowerCase();
      return FINANCE_KEYWORDS.some(kw => combined.includes(kw));
    });

    if (!candidates.length) return undefined;

    const ranked = candidates.sort((a, b) => {
      const aHasDesc = !!(a.pages?.[0]?.description);
      const bHasDesc = !!(b.pages?.[0]?.description);
      if (aHasDesc && !bHasDesc) return -1;
      if (!aHasDesc && bHasDesc) return 1;
      return b.year - a.year;
    });

    const pick = ranked[0];
    const name = pick.pages?.[0]?.title ?? pick.text.split(",")[0].trim();
    const extract = pick.pages?.[0]?.extract ?? pick.text;
    const description = pick.pages?.[0]?.description ?? "";

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Based on this Wikipedia extract, write a short finance-focused bio for ${name} (born ${pick.year}).

Extract: "${extract.slice(0, 600)}"
Description: "${description}"

Return ONLY valid JSON, no markdown:
{"role":"Short title/role, e.g. Fed Chairman 1979–87 (max 8 words)","significance":"1-2 sentences on their finance or business impact."}`,
      }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text
      .replace(/```json\n?|\n?```/g, "").trim();
    const bio = JSON.parse(raw);

    return {
      name,
      birthYear: pick.year,
      role: bio.role ?? description,
      significance: bio.significance ?? extract.split(".")[0] + ".",
    };
  } catch {
    return undefined;
  }
}

async function buildHistory(monthDay: string, month: number, day: number): Promise<TodayHistory> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing API key");

  const client = new Anthropic({ apiKey });

  const [eventsResult, bornToday] = await Promise.all([
    client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      messages: [{
        role: "user",
        content: `You are a financial historian with extremely high standards for date accuracy.

For ${monthDay}, provide up to 4 notable financial/business events that occurred on EXACTLY this calendar date.

CRITICAL RULES:
- Only include an event if you are CERTAIN it occurred on this exact calendar date (month and day).
- If you are unsure of the exact date, OMIT it. Better to return 2 verified facts than 4 dubious ones.
- Do NOT include events that happened "around" this date or in the same week.

Return ONLY valid JSON — no markdown:
{"items":[{"year":1987,"headline":"Short punchy headline, max 8 words","detail":"1-2 sentences of context and why it mattered.","category":"market|company|figure|policy|crisis"}]}

Sort items most recent first. Vary categories.`,
      }],
    }),
    fetchBornToday(month, day, client),
  ]);

  const raw = (eventsResult.content[0] as { type: string; text: string }).text
    .replace(/```json\n?|\n?```/g, "").trim();
  const json = JSON.parse(raw);

  return {
    monthDay,
    items: (json.items ?? []).slice(0, 4),
    bornToday,
    generatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing API key" }, { status: 500 });

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const monthDay = now.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const cacheKey = `${month}-${day}`;

  // Serve from in-memory cache if same calendar day
  const cached = dayCache.get(cacheKey);
  if (cached) {
    return Response.json(cached, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=1800" },
    });
  }

  try {
    const result = await buildHistory(monthDay, month, day);
    // Store and evict any stale day entries
    dayCache.clear();
    dayCache.set(cacheKey, result);
    return Response.json(result, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=1800" },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
