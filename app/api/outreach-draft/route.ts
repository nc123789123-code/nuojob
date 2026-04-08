export const runtime = "nodejs";

import Anthropic from "@anthropic-ai/sdk";

export interface OutreachDraft {
  subject: string;
  message: string;
  followUp: string;
  timingNote: string;
  whyItWorks: string;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { firm, background, signal, targetRole } = body as {
    firm: string;
    background: string;
    signal: string;
    targetRole?: string;
  };

  if (!firm?.trim() || !background?.trim()) {
    return Response.json({ error: "firm and background are required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

  try {
    const client = new Anthropic({ apiKey });

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      messages: [{
        role: "user",
        content: `You are a career coach who specializes in buyside job outreach for finance professionals. Your outreach messages have a 3x higher response rate because they reference specific signals and position the candidate as a direct solution to the firm's current need.

FIRM: ${firm.trim()}
CANDIDATE BACKGROUND: ${background.trim()}
${signal?.trim() ? `RECENT SIGNAL / NEWS: ${signal.trim()}` : ""}
${targetRole?.trim() ? `TARGET ROLE TYPE: ${targetRole.trim()}` : ""}

Write a highly targeted cold outreach message for this candidate to send directly to a senior person (VP/MD level, not HR) at ${firm.trim()}.

RULES:
- Open with a specific reference to the signal/news (if provided), or to the firm's known strategy/recent activity
- Second sentence: connect their specific need to the candidate's exact background — make it feel like an obvious match
- Keep total message to 5-7 sentences. No fluff, no "I hope this email finds you well"
- End with one clear, low-friction CTA (15-min call, not "open to any opportunity")
- The subject line must reference the specific signal or firm activity, not be generic
- Write in a confident, direct tone — not sycophantic
- Return ONLY valid JSON, no markdown

Return this exact JSON:
{
  "subject": "Subject line referencing specific signal/context",
  "message": "Full message body, 5-7 sentences",
  "followUp": "One sentence follow-up to send 5-7 days later if no reply",
  "timingNote": "One sentence on optimal timing to send this (day of week, time, signal age window)",
  "whyItWorks": "One sentence explaining why this message will get a higher response rate than a generic application"
}`,
      }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text
      .replace(/```json\n?|\n?```/g, "").trim();
    const result: OutreachDraft = JSON.parse(raw);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
