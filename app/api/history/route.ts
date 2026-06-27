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

// Only cache successful non-empty responses
const dayCache = new Map<string, TodayHistory>();

function extractJson(text: string): unknown {
  const stripped = text.replace(/```json\n?|\n?```/g, "").trim();
  try { return JSON.parse(stripped); } catch { /* fall through */ }
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("No JSON in response");
}

async function fetchBornToday(month: number, day: number, client: Anthropic): Promise<BornToday | undefined> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/births/${month}/${day}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "OnluIntel/1.0 (onluintel.com)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return undefined;

    const data = await res.json() as { births?: WikiBirth[] };
    const births: WikiBirth[] = data.births ?? [];

    const candidates = births.filter(b => {
      const combined = [b.text, b.pages?.[0]?.extract ?? "", b.pages?.[0]?.description ?? ""].join(" ").toLowerCase();
      return FINANCE_KEYWORDS.some(kw => combined.includes(kw));
    });
    if (!candidates.length) return undefined;

    const pick = [...candidates].sort((a, b) => {
      const aD = !!(a.pages?.[0]?.description), bD = !!(b.pages?.[0]?.description);
      return aD === bD ? b.year - a.year : aD ? -1 : 1;
    })[0];

    const name = pick.pages?.[0]?.title ?? pick.text.split(",")[0].trim();
    const extract = (pick.pages?.[0]?.extract ?? pick.text).slice(0, 500);
    const description = pick.pages?.[0]?.description ?? "";

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 180,
      messages: [{
        role: "user",
        content: `Write a finance bio for ${name} (born ${pick.year}) based on: "${extract}" / "${description}"
Return raw JSON only: {"role":"title/role max 8 words","significance":"1-2 sentences on finance impact."}`,
      }],
    });

    const bio = extractJson((msg.content[0] as { type: string; text: string }).text) as { role?: string; significance?: string };
    return { name, birthYear: pick.year, role: bio.role ?? description, significance: bio.significance ?? extract.split(".")[0] + "." };
  } catch {
    return undefined;
  }
}

async function buildHistory(monthDay: string, month: number, day: number): Promise<TodayHistory> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing API key");
  const client = new Anthropic({ apiKey });

  const [eventsMsg, bornToday] = await Promise.all([
    client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 700,
      messages: [{
        role: "user",
        content: `You are a precise financial historian. List up to 4 real financial/business events on EXACTLY ${monthDay} (this exact month and day only).

Rules:
- Include ONLY events you are certain happened on this specific date
- Omit any event if unsure of exact date
- Return at least 1-2 events you are confident about

Return raw JSON only:
{"items":[{"year":1987,"headline":"8 words max","detail":"1-2 sentences why it mattered.","category":"market|company|figure|policy|crisis"}]}`,
      }],
    }),
    fetchBornToday(month, day, client),
  ]);

  const json = extractJson((eventsMsg.content[0] as { type: string; text: string }).text) as { items?: HistoryItem[] };
  const items = (json.items ?? []).slice(0, 4);

  return { monthDay, items, bornToday, generatedAt: new Date().toISOString() };
}

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing API key" }, { status: 500 });

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const monthDay = now.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const cacheKey = `${month}-${day}`;

  const cached = dayCache.get(cacheKey);
  if (cached) {
    return Response.json(cached, { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=1800" } });
  }

  try {
    const result = await buildHistory(monthDay, month, day);
    // Only cache if we actually got events — don't lock in an empty result
    if (result.items.length > 0) {
      dayCache.clear();
      dayCache.set(cacheKey, result);
    }
    return Response.json(result, { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=1800" } });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
