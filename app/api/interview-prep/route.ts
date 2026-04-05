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
    max_tokens: 4000,
    messages: [{
      role: "user",
      content: `You are a senior buyside professional who has interviewed at and worked at top hedge funds, private credit firms, and PE funds. Generate a comprehensive, firm-specific interview prep guide for: "${firm}"

Recent news about this firm: ${news.length > 0 ? news.join(" | ") : "No recent news available"}

Return ONLY a JSON object with this exact structure:
{
  "firm": "${firm}",
  "strategy": "1-line description of their primary investment strategy and AUM if known",
  "overview": "3-4 sentences covering what makes this firm distinctive, their edge, culture, and what they look for in candidates",
  "recentDevelopments": ["3-5 recent or notable developments about this firm that an interviewer might reference"],
  "behavioral": [
    {
      "question": "specific behavioral question this firm is known to ask",
      "context": "what they are really testing with this question",
      "tip": "how to answer it well for this specific firm"
    }
  ],
  "technical": [
    {
      "question": "specific technical question relevant to their strategy",
      "context": "what skill or knowledge they are assessing",
      "tip": "how to frame your answer given their specific approach"
    }
  ],
  "whatTheyValue": ["4-6 specific traits or qualities this firm prioritizes in candidates"],
  "redFlags": ["3-5 things that would immediately disqualify a candidate at this firm"]
}

Include 4 behavioral and 4 technical questions. Keep each "context" and "tip" field under 2 sentences. Be highly specific to this firm's strategy. Return only valid JSON — no extra text.`,
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
