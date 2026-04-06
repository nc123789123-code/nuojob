import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 24-hour in-memory cache
const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const firm = req.nextUrl.searchParams.get("firm")?.trim();
  const group = req.nextUrl.searchParams.get("group")?.trim() || "";
  if (!firm) return Response.json({ error: "firm is required" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

  const cacheKey = `${firm.toLowerCase()}|${group.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TTL) return Response.json(cached.data);

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: [{
        role: "user",
        content: `List investment professionals at "${firm}"${group ? ` on the ${group} team` : ""} based on publicly available information.

RULES:
- Include senior professionals (Partner, MD, Director level) you have reasonable confidence about at this firm
- For VP/Associate/Analyst level, only include if clearly associated with this firm publicly
- Do NOT move people between firms — double-check the firm name before listing anyone
- Focus on investment/portfolio professionals (not legal, HR, marketing)
- Aim for 8-15 people for large firms, 4-8 for mid-size, 2-4 for smaller firms
- If unsure about someone, still include them but set confidence to "low"

Return ONLY valid JSON:
{
  "firm": "${firm}",
  "teamPage": "URL of the firm's official team/people page, or null",
  "linkedinPage": "URL of the firm's LinkedIn company page, or null",
  "groups": [
    {
      "name": "Team or strategy name",
      "members": [
        {
          "name": "Full name",
          "title": "Title as publicly listed",
          "seniority": "partner|md|director|vp|associate|analyst",
          "notes": "1 sentence of publicly known background, or null"
        }
      ]
    }
  ],
  "totalListed": 0,
  "confidence": "high|medium|low",
  "confidenceNote": "1 sentence explaining confidence — be honest if uncertain"
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
