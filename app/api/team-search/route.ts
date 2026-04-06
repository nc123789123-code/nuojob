import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 24-hour in-memory cache
const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const firm = req.nextUrl.searchParams.get("firm")?.trim();
  if (!firm) return Response.json({ error: "firm is required" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

  const cacheKey = firm.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TTL) return Response.json(cached.data);

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: [{
        role: "user",
        content: `List the investment professionals at "${firm}" based on publicly available information.

RULES:
- Only include people whose names and titles have been publicly listed on the firm's website, press releases, or reputable news sources
- Do NOT fabricate names — if you are not confident a person works there, omit them
- Focus on investment/portfolio professionals only (not legal, compliance, HR, marketing)
- Include seniority levels: Partner, MD, Director, VP, Associate, Analyst
- Group by team/strategy where relevant (e.g. Direct Lending, Special Situations, Real Estate)
- Max 20 people

Return ONLY valid JSON:
{
  "firm": "${firm}",
  "teamPage": "URL of the firm's public team/people page if known, else null",
  "groups": [
    {
      "name": "Team or strategy name (e.g. Direct Lending, Credit, PE)",
      "members": [
        {
          "name": "Full name",
          "title": "Exact title",
          "seniority": "partner|md|director|vp|associate|analyst",
          "notes": "1 sentence: focus area or notable background if publicly known, else null"
        }
      ]
    }
  ],
  "totalListed": 0,
  "confidence": "high|medium|low",
  "confidenceNote": "1 sentence explaining confidence level"
}`,
      }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return Response.json({ error: "Could not parse response" }, { status: 500 });

    const data = JSON.parse(jsonMatch[0]);
    cache.set(cacheKey, { data, ts: Date.now() });
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
