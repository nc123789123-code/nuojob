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
  const group = (searchParams.get("group") || "").trim();
  if (!firm) return Response.json({ error: "Missing firm name" }, { status: 400 });

  const key = `${firm.toLowerCase()}|${group.toLowerCase()}`;
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
      max_tokens: 8000,
      messages: [{
        role: "user",
        content: `You are a senior buyside professional. Generate a firm-specific interview prep guide for: "${firm}"${group ? ` — specifically for the ${group} team/group` : ""}

BUSINESS NEWS: ${newsHeadlines.length > 0 ? newsHeadlines.join(" | ") : "none"}
CULTURE NEWS: ${cultureHeadlines.length > 0 ? cultureHeadlines.join(" | ") : "none"}

STRICT RULES:
- Never name specific individuals
- No fabricated dates or deals
- Be specific to ${firm}'s actual strategy — no generic finance advice
- Keep each string field concise (1-3 sentences max)

Return ONLY valid JSON with NO trailing commas, NO comments:
{
  "firm": "${firm}",
  "strategy": "2 sentences: strategy, AUM, key markets",
  "overview": "3 sentences: what makes them distinctive, investment edge, what succeeds there",
  "culture": "3 sentences: pace, collaboration style, performance expectations",
  "recentDevelopments": ["3 items — 1-2 sentences each: what happened and why it matters for the interview"],
  "behavioral": [
    {
      "question": "firm-specific behavioral question",
      "context": "2 sentences: what they are diagnosing and why this firm cares",
      "tip": "2 sentences: what to lead with and how to close tied to this firm"
    }
  ],
  "technical": [
    {
      "question": "strategy-specific technical question",
      "context": "2 sentences: skill being tested and how it maps to their work",
      "tip": "3 sentences: step-by-step framework, key metrics, what separates good from great"
    }
  ],
  "whatTheyValue": ["4 traits — 1 sentence each: the trait and how it shows up"],
  "redFlags": ["3 items — 1 sentence each: the red flag and what it signals"]
}

5 behavioral, 5 technical. Return only valid JSON.`,
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
