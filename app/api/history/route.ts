export const runtime = "nodejs";

import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";

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

async function buildHistory(monthDay: string): Promise<TodayHistory> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing API key");

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1100,
    messages: [{
      role: "user",
      content: `You are a financial historian with extremely high standards for date accuracy.

For ${monthDay}, provide:
1. Up to 4 notable financial/business events that occurred on EXACTLY this calendar date.
2. The most notable finance or business figure born on EXACTLY this calendar date.

CRITICAL RULES:
- Only include an event if you are CERTAIN it occurred on this exact calendar date (month and day). Do NOT include events that happened "around" this date, the day before, or the day after.
- If you are unsure of the exact date, OMIT the item entirely. It is better to return 2 verified facts than 4 dubious ones.
- Do NOT include events where the notable action happened on a different date (e.g. a vote on the 23rd announced on the 24th counts only if the announcement itself is the historic moment).
- For bornToday: only include if you are certain of the exact birth date.

Return ONLY valid JSON — no markdown:
{
  "items":[{"year":1987,"headline":"Short punchy headline, max 8 words","detail":"1-2 sentences of context and why it mattered.","category":"market|company|figure|policy|crisis"}],
  "bornToday":{"name":"Full Name","birthYear":1930,"role":"Short title/role, e.g. Fed Chairman 1979–87","significance":"1-2 sentences on their impact on finance or business."}
}

Sort items most recent first. Vary categories. Omit bornToday if not certain.`,
    }],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text
    .replace(/```json\n?|\n?```/g, "").trim();
  const json = JSON.parse(raw);
  return {
    monthDay,
    items: (json.items ?? []).slice(0, 4),
    bornToday: json.bornToday ?? undefined,
    generatedAt: new Date().toISOString(),
  };
}

const getCachedHistory = unstable_cache(buildHistory, ["history-v3"], { revalidate: 86400 }); // 24h

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing API key" }, { status: 500 });

  const monthDay = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York", month: "long", day: "numeric",
  });

  try {
    const result = await getCachedHistory(monthDay);
    return Response.json(result, {
      headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600" },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
