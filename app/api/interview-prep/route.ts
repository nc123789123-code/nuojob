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
  recentDevelopments: string[];
  behavioral: PrepQuestion[];
  technical: PrepQuestion[];
  whatTheyValue: string[];
  redFlags: string[];
  generatedAt: string;
}

async function fetchFirmNews(firm: string): Promise<string[]> {
  const short = firm.replace(/\b(LP|LLC|Ltd|Inc|Corp|Fund|Partners|Capital|Management|Advisors?|Group)\b.*/i, "").trim().slice(0, 40);
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`"${short}" finance investment`)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const xml = await res.text();
    const cdata = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)].slice(1, 6).map(m => m[1].trim());
    if (cdata.length > 0) return cdata;
    return [...xml.matchAll(/<title>(.*?)<\/title>/g)].slice(1, 6).map(m => m[1].trim());
  } catch { return []; }
}

const cache = new Map<string, { data: InterviewPrep; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const firm = (searchParams.get("firm") || "").trim();
  if (!firm) return Response.json({ error: "Missing firm name" }, { status: 400 });

  const key = firm.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return Response.json(cached.data);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY not set in environment" }, { status: 500 });

  try {
  const news = await fetchFirmNews(firm);

  const client = new Anthropic({ apiKey });

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 6000,
    messages: [{
      role: "user",
      content: `You are a senior buyside professional generating an interview prep guide for: "${firm}"

LIVE NEWS (prioritize these for recentDevelopments):
${news.length > 0 ? news.map((n, i) => `${i + 1}. ${n}`).join("\n") : "No live news available"}

STRICT RULES:
- Do NOT mention specific people by name — you may get them wrong
- Do NOT reference specific deal dates or years unless from live news above
- For recentDevelopments: use live news if available, otherwise include 3-4 well-known factual things about this firm (AUM milestones, strategy expansions, market position) — never invent events

Return ONLY valid JSON:
{
  "firm": "${firm}",
  "strategy": "1-line: primary strategy and approximate AUM if well-known",
  "overview": "4-5 sentences on what makes this firm distinctive, their investment edge, culture, and what separates strong candidates",
  "recentDevelopments": ["3-4 factual developments — each 2-3 sentences explaining the development and why it matters for an interviewer"],
  "behavioral": [
    {
      "question": "firm-specific behavioral question",
      "context": "2-3 sentences on exactly what the interviewer is probing for and why this firm cares about it specifically",
      "tip": "3-4 sentences with a concrete framework for how to answer — include what to emphasize, what to avoid, and ideally what a strong answer structure looks like for this firm"
    }
  ],
  "technical": [
    {
      "question": "strategy-specific technical question",
      "context": "2-3 sentences on what analytical skill or judgment they are assessing and how it connects to their actual investment process",
      "tip": "4-5 sentences walking through how to structure a strong answer — include the key concepts to hit, the analytical framework to use, and what distinguishes a good answer from a great one at this firm"
    }
  ],
  "whatTheyValue": ["4-5 specific traits this firm prioritizes — each as a full sentence explaining why they value it"],
  "redFlags": ["3-4 things that disqualify candidates — each as a full sentence explaining what it signals to the interviewer"]
}

Include 4 behavioral and 4 technical questions. Tailor everything tightly to their specific strategy. Return only valid JSON.`,
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
