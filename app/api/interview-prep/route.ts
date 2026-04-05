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
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const xml = await res.text();
    const cdata = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)].slice(1, 5).map(m => m[1].trim());
    if (cdata.length > 0) return cdata;
    return [...xml.matchAll(/<title>(.*?)<\/title>/g)].slice(1, 5).map(m => m[1].trim());
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
  if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY not set in environment" }, { status: 500 });

  try {
    const short = firm.replace(/\b(LP|LLC|Ltd|Inc|Corp|Fund|Partners|Capital|Management|Advisors?|Group)\b.*/i, "").trim().slice(0, 40);

    const [newsHeadlines, cultureHeadlines] = await Promise.all([
      fetchNews(`"${short}" finance investment fund`),
      fetchNews(`"${short}" culture work environment careers employees`),
    ]);

    const client = new Anthropic({ apiKey });

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{
        role: "user",
        content: `You are a senior buyside professional who has worked at top hedge funds, private credit firms, and PE funds. Generate a detailed, firm-specific interview prep guide for: "${firm}"

LIVE BUSINESS NEWS:
${newsHeadlines.length > 0 ? newsHeadlines.map((n, i) => `${i + 1}. ${n}`).join("\n") : "None available"}

LIVE CULTURE/WORKPLACE NEWS:
${cultureHeadlines.length > 0 ? cultureHeadlines.map((n, i) => `${i + 1}. ${n}`).join("\n") : "None available"}

STRICT RULES:
- Do NOT name specific individuals — you risk getting them wrong
- Do NOT reference specific deal dates unless from live news above
- For recentDevelopments: use live news first, then supplement with well-known public facts (AUM, strategy, market position) — never fabricate
- Be highly specific to this firm's actual investment strategy — generic answers are useless
- For technical questions: provide complete analytical frameworks a candidate could walk through in the room, not just hints
- For behavioral questions: explain exactly what the interviewer is diagnosing and provide a concrete answer structure with what to include

Return ONLY valid JSON with this structure:
{
  "firm": "${firm}",
  "strategy": "2-3 sentences: primary strategy, AUM if known, key markets/asset classes they focus on",
  "overview": "5-6 sentences: what makes this firm distinctive vs peers, their investment edge, how decisions are made, team structure, and what kind of person succeeds there",
  "culture": "4-5 sentences: work environment, pace, how collaborative vs siloed, what the firm values in day-to-day behavior, how performance is evaluated, and what employees say publicly about the culture",
  "recentDevelopments": [
    "4-5 items — each 2-3 sentences: what happened, why it matters strategically, and what an interviewer might ask you about it"
  ],
  "behavioral": [
    {
      "question": "specific behavioral question tailored to this firm's culture and strategy",
      "context": "3-4 sentences: exactly what the interviewer is diagnosing, why this firm cares about it specifically, and what a weak vs strong answer looks like at this firm",
      "tip": "4-5 sentences: concrete answer structure — what to lead with, what specific details to include, what to avoid, and how to tie it back to this firm's specific context"
    }
  ],
  "technical": [
    {
      "question": "specific technical question tied to this firm's investment strategy and process",
      "context": "3-4 sentences: what skill or judgment they are testing, how it maps to their actual work, and what level of depth they expect",
      "tip": "5-6 sentences: full analytical framework to walk through — key metrics to reference, how to structure the answer step by step, specific terminology relevant to their strategy, and what separates a good answer from a great one"
    }
  ],
  "whatTheyValue": [
    "5-6 traits — each 2 sentences: the specific trait and a concrete example of how it shows up in their investment process or interview"
  ],
  "redFlags": [
    "4-5 items — each 2 sentences: the red flag and exactly what it signals to the interviewer at this firm"
  ]
}

Include 6 behavioral and 6 technical questions. Every answer must be specific to ${firm} — not generic advice that applies to any finance firm. Return only valid JSON.`,
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
