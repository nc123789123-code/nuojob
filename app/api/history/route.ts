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
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1100,
    messages: [{
      role: "user",
      content: `You are a financial historian. For ${monthDay}:

1. List 4 notable things that happened on this date in financial history. Mix: major market events, company milestones, policy shifts, financial crises.
2. Name the single most notable finance or business figure born on this date (any year).

Return ONLY valid JSON — no markdown:
{
  "items":[{"year":1987,"headline":"Short punchy headline, max 8 words","detail":"1-2 sentences of context and why it mattered.","category":"market|company|figure|policy|crisis"}],
  "bornToday":{"name":"Full Name","birthYear":1930,"role":"Short title/role, e.g. Fed Chairman 1979–87","significance":"1-2 sentences on their impact on finance or business."}
}

Rules: only well-documented facts; items sorted most recent first; vary item categories; if no notable finance figure was born on this date, omit bornToday.`,
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

const getCachedHistory = unstable_cache(buildHistory, ["history-v2"], { revalidate: 86400 }); // 24h

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
