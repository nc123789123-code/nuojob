export const runtime = "nodejs";
export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";

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

const cache = new Map<string, { data: ConceptAnswer; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const concept = (searchParams.get("concept") || "").trim();
  if (!concept) return Response.json({ error: "Missing concept" }, { status: 400 });

  const key = concept.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return Response.json(cached.data);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

  try {
    const client = new Anthropic({ apiKey });

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `You are a senior buyside professional explaining finance and investing concepts to a junior analyst preparing for interviews at hedge funds, private credit, PE, or equity research firms.

Explain this concept clearly and practically: "${concept}"

STRICT RULES:
- Be concrete and specific — no vague generalities
- Use the lens of how a buyside investor actually uses this concept
- Keep each section concise (2-4 sentences max per bullet)
- Return ONLY valid JSON, no markdown, no comments

Return this exact JSON structure:
{
  "concept": "${concept}",
  "oneLiner": "One sharp sentence defining the concept",
  "sections": [
    {
      "title": "What It Is",
      "content": "2-3 sentences: clear definition and core mechanics",
      "bullets": ["key point 1", "key point 2", "key point 3"]
    },
    {
      "title": "How It Works in Practice",
      "content": "2-3 sentences: step-by-step or real-world application",
      "bullets": ["step/example 1", "step/example 2", "step/example 3"]
    },
    {
      "title": "Why It Matters on the Buyside",
      "content": "2-3 sentences: how investors actually use this in their work",
      "bullets": ["use case 1", "use case 2", "use case 3"]
    }
  ],
  "interviewAngle": "2-3 sentences: what interviewers are really testing when they ask about this, and how to answer well",
  "commonMistakes": ["mistake 1", "mistake 2", "mistake 3"],
  "relatedConcepts": ["concept1", "concept2", "concept3", "concept4"]
}`,
      }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    const json = JSON.parse(jsonMatch[0]);
    const result: ConceptAnswer = { ...json, generatedAt: new Date().toISOString() };

    cache.set(key, { data: result, ts: Date.now() });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
