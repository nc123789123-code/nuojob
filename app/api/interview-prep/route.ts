export const runtime = "nodejs";

import Anthropic from "@anthropic-ai/sdk";

export interface PrepQuestion {
  question: string;
  context: string;
  tip: string;
}

export interface InterviewPrep {
  firm: string;
  strategy: string;
  overview: string;
  culture: string;
  recentDevelopments: string[];
  behavioral: PrepQuestion[];
  technical: PrepQuestion[];
  whatTheyValue: string[];
  redFlags: string[];
  generatedAt: string;
}

async function fetchNews(query: string): Promise<string[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const xml = await res.text();
    const cdata = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)].slice(1, 4).map(m => m[1].trim());
    if (cdata.length > 0) return cdata;
    return [...xml.matchAll(/<title>(.*?)<\/title>/g)].slice(1, 4).map(m => m[1].trim());
  } catch { return []; }
}

const cache = new Map<string, { data: InterviewPrep; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const firm = (searchParams.get("firm") || "").trim();
  if (!firm) return Response.json({ error: "Missing firm name" }, { status: 400 });

  const key = firm.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return Response.json(cached.data);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

  try {
    const short = firm.replace(/\b(LP|LLC|Ltd|Inc|Corp|Fund|Partners|Capital|Management|Advisors?|Group)\b.*/i, "").trim().slice(0, 40);

    const [newsHeadlines, cultureHeadlines] = await Promise.all([
      fetchNews(`"${short}" finance investment`),
      fetchNews(`"${short}" culture workplace employees`),
    ]);

    const client = new Anthropic({ apiKey });

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 5000,
      messages: [{
        role: "user",
        content: `You are a senior buyside professional. Generate a firm-specific interview prep guide for: "${firm}"

BUSINESS NEWS: ${newsHeadlines.length > 0 ? newsHeadlines.join(" | ") : "none"}
CULTURE NEWS: ${cultureHeadlines.length > 0 ? cultureHeadlines.join(" | ") : "none"}

RULES:
- Never name specific individuals
- No fabricated dates or deals
- Be specific to ${firm}'s actual strategy — no generic finance advice
- Technical tips must include a full walkthrough framework a candidate can use in the room
- Behavioral tips must include what to lead with, what to avoid, and how to close

Return ONLY valid JSON:
{
  "firm": "${firm}",
  "strategy": "2-3 sentences: strategy, AUM, key markets",
  "overview": "5 sentences: what makes them distinctive, investment edge, decision-making, what succeeds there",
  "culture": "4 sentences: pace, collaboration style, performance evaluation, what employees say",
  "recentDevelopments": ["4 items — 2 sentences each: what happened and why an interviewer might raise it"],
  "behavioral": [
    {
      "question": "firm-specific behavioral question",
      "context": "3 sentences: what they are diagnosing, why this firm cares, weak vs strong signal",
      "tip": "4 sentences: what to lead with, specific details to include, what to avoid, how to tie back to this firm"
    }
  ],
  "technical": [
    {
      "question": "strategy-specific technical question",
      "context": "3 sentences: skill being tested, how it maps to their work, depth expected",
      "tip": "5 sentences: step-by-step framework, key metrics, specific terminology, what separates good from great"
    }
  ],
  "whatTheyValue": ["5 traits — 2 sentences each: the trait and how it shows up in their process"],
  "redFlags": ["4 items — 2 sentences each: the red flag and what it signals"]
}

6 behavioral, 6 technical. Return only valid JSON.`,
      }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.replace(/```json\n?|\n?```/g, "").trim();
    const json = JSON.parse(raw);
    const result: InterviewPrep = { ...json, generatedAt: new Date().toISOString() };

    cache.set(key, { data: result, ts: Date.now() });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[interview-prep]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
