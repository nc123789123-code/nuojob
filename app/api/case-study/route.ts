export const runtime = "nodejs";

import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";

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

const SYSTEM = `You are a buyside finance expert. Given a deal name, return a JSON object for interview prep. Be concise — every field must be short. Return ONLY valid JSON, no markdown.`;

const PROMPT = (deal: string) => `Deal: "${deal}"\nReturn JSON:\n{"deal":"Full name + year","company":"name","year":"year","type":"distressed|lbo|credit|restructuring|ma","size":"deal size","keyPlayers":["up to 4 firms"],"snapshot":"2-3 sentences","mechanics":["4 bullets"],"interviewQ":"one interview question","modelAnswer":"3-4 sentence answer","lessons":["3 takeaways"]}`;

async function buildCaseStudy(deal: string): Promise<CaseStudy> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("No API key");

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
  return JSON.parse(jsonMatch[0]) as CaseStudy;
}

const getCachedCaseStudy = unstable_cache(buildCaseStudy, ["case-study"], { revalidate: 86400 }); // 24h

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const deal = (searchParams.get("deal") ?? "").trim();
  if (!deal || deal.length < 3) return Response.json({ error: "Missing deal parameter" }, { status: 400 });

  try {
    const data = await getCachedCaseStudy(deal.toLowerCase());
    return Response.json(data, {
      headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600" },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
