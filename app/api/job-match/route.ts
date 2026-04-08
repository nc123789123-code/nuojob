export const runtime = "nodejs";

import Anthropic from "@anthropic-ai/sdk";

export interface JobMatch {
  id: string;
  role: string;
  firm: string;
  location: string;
  daysAgo: number;
  url: string;
  score: number; // 1-10
  reason: string;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { profile, jobs } = body as {
    profile: string;
    jobs: { id: string; role: string; firm: string; location: string; daysAgo: number; url: string }[];
  };

  if (!profile?.trim()) return Response.json({ error: "profile required" }, { status: 400 });
  if (!jobs?.length) return Response.json({ matches: [] });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

  // Limit to top 40 roles to keep tokens manageable
  const subset = jobs.slice(0, 40);

  try {
    const client = new Anthropic({ apiKey });

    const jobList = subset.map((j, i) => `${i}: ${j.role} at ${j.firm} (${j.location})`).join("\n");

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are a buyside recruiting specialist. Score how well a candidate's profile matches each open role.

CANDIDATE PROFILE:
${profile.trim()}

OPEN ROLES (index: role at firm):
${jobList}

Score each role 1-10 based on profile fit. Only include roles scoring 6 or above.
Return top 8 matches maximum.
Be concise — reason is one short sentence (max 12 words).

Return ONLY valid JSON:
{
  "matches": [
    { "index": 0, "score": 8, "reason": "Direct lending background aligns with mandate" }
  ]
}`,
      }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text
      .replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(raw);

    const matches: JobMatch[] = (parsed.matches ?? [])
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .map((m: { index: number; score: number; reason: string }) => {
        const job = subset[m.index];
        if (!job) return null;
        return { ...job, score: m.score, reason: m.reason };
      })
      .filter(Boolean);

    return Response.json({ matches });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
