export const runtime = "nodejs";
export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";

export interface ConceptSection {
  title: string;
  content: string;
  bullets?: string[];
}

export interface ConceptAnswer {
  concept: string;
  oneLiner: string;
  sections: ConceptSection[];
  interviewAngle: string;
  commonMistakes: string[];
  relatedConcepts: string[];
  generatedAt: string;
}

async function buildConceptAnswer(concept: string): Promise<ConceptAnswer> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1400,
    messages: [{
      role: "user",
      content: `Explain "${concept}" to a junior analyst preparing for buyside interviews. Be concrete, use investor lens. Return ONLY valid JSON:\n{"concept":"${concept}","oneLiner":"one sharp sentence","sections":[{"title":"What It Is","content":"2-3 sentences","bullets":["pt","pt","pt"]},{"title":"How It Works in Practice","content":"2-3 sentences","bullets":["pt","pt","pt"]},{"title":"Why It Matters on the Buyside","content":"2-3 sentences","bullets":["pt","pt","pt"]}],"interviewAngle":"2 sentences: what interviewers test and how to answer well","commonMistakes":["mistake 1","mistake 2","mistake 3"],"relatedConcepts":["c1","c2","c3","c4"]}`,
    }],
  });

  const text = (msg.content[0] as { type: string; text: string }).text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  return { ...JSON.parse(jsonMatch[0]), generatedAt: new Date().toISOString() };
}

const getCachedConcept = unstable_cache(buildConceptAnswer, ["concept-qa"], { revalidate: 86400 }); // 24h

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const concept = (searchParams.get("concept") || "").trim();
  if (!concept) return Response.json({ error: "Missing concept" }, { status: 400 });

  try {
    const result = await getCachedConcept(concept.toLowerCase());
    return Response.json(result, {
      headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600" },
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
