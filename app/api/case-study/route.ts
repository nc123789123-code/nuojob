/**
 * Case Study API — AI-generated deal breakdowns for interview prep
 * Uses Claude Haiku (cheapest) with a tight structured prompt.
 * 24h server-side cache keyed by deal name to minimize token usage.
 */

export const runtime = "nodejs";
import Anthropic from "@anthropic-ai/sdk";

export interface CaseStudy {
  deal: string;
  company: string;
  year: string;
  type: "distressed" | "lbo" | "credit" | "restructuring" | "ma";
  size: string;
  keyPlayers: string[];
  snapshot: string;
  mechanics: string[];
  interviewQ: string;
  modelAnswer: string;
  lessons: string[];
}

// 24h cache keyed by normalized deal name
const cache = new Map<string, { data: CaseStudy; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

const SYSTEM = `You are a buyside finance expert. Given a deal name, return a JSON object for interview prep. Be concise — every field must be short. Return ONLY valid JSON, no markdown.`;

const PROMPT = (deal: string) => `Deal: "${deal}"

Return JSON with these exact fields:
{
  "deal": "Full deal name + year e.g. Hertz Chapter 11 (2020)",
  "company": "Company name",
  "year": "Year",
  "type": one of: "distressed" | "lbo" | "credit" | "restructuring" | "ma",
  "size": "Deal size or debt amount e.g. $19B in liabilities",
  "keyPlayers": ["up to 4 buyside firms involved"],
  "snapshot": "2-3 sentences. What happened and why it matters.",
  "mechanics": ["4 bullets on the financial structure / key mechanics"],
  "interviewQ": "One interview question an interviewer would ask about this deal",
  "modelAnswer": "3-4 sentence model answer to that question",
  "lessons": ["3 short key takeaways for buyside candidates"]
}`;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const deal = (searchParams.get("deal") ?? "").trim();
  if (!deal || deal.length < 3) {
    return Response.json({ error: "Missing deal parameter" }, { status: 400 });
  }

  const key = deal.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json(cached.data);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "No API key" }, { status: 500 });

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: SYSTEM,
      messages: [{ role: "user", content: PROMPT(deal) }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const data = JSON.parse(jsonMatch[0]) as CaseStudy;
    cache.set(key, { data, ts: Date.now() });
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
