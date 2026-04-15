import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";

export const runtime = "nodejs";

async function buildTeamSearch(firm: string, group: string): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    messages: [{
      role: "user",
      content: `List investment professionals at "${firm}"${group ? ` on the ${group} team` : ""} based on publicly available information. Only include people you have reasonable confidence about.\n\nReturn ONLY valid JSON:\n{"firm":"${firm}","teamPage":"URL or null","linkedinPage":"URL or null","groups":[{"name":"team name","members":[{"name":"Full name","title":"title","seniority":"partner|md|director|vp|associate|analyst","notes":"1 sentence or null"}]}],"totalListed":0,"confidence":"high|medium|low","confidenceNote":"1 sentence"}`,
    }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse response");
  return JSON.parse(jsonMatch[0]);
}

const getCachedTeamSearch = unstable_cache(buildTeamSearch, ["team-search"], { revalidate: 86400 }); // 24h

export async function GET(req: NextRequest) {
  const firm = req.nextUrl.searchParams.get("firm")?.trim();
  const group = req.nextUrl.searchParams.get("group")?.trim() || "";
  if (!firm) return Response.json({ error: "firm is required" }, { status: 400 });

  try {
    const data = await getCachedTeamSearch(firm.toLowerCase(), group.toLowerCase());
    return Response.json(data, {
      headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600" },
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
