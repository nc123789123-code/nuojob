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
        content: `You are a career coach who helps finance professionals land buyside roles through genuine, human outreach — not templated cold emails.

FIRM: ${firm.trim()}
CANDIDATE BACKGROUND: ${background.trim()}
${signal?.trim() ? `RECENT SIGNAL / NEWS: ${signal.trim()}` : ""}
${targetRole?.trim() ? `TARGET ROLE TYPE: ${targetRole.trim()}` : ""}

Write a warm, personal cold outreach message for this candidate to send to a senior person (VP/MD level) at ${firm.trim()}.

TONE & STYLE:
- Sound like a real person writing to another real person — not a cover letter, not a press release
- It's okay to be slightly informal: a short, genuine sentence goes further than a polished one
- Show genuine curiosity about the firm and what they're working on
- Reference the signal or firm activity naturally, as if you've been following the firm — not as a sales hook
- The candidate's background should come up organically, not as a credentials list
- A little personality is good. Dry confidence beats aggressive enthusiasm every time
- End with a low-key CTA: a 15-minute chat, not "I'd welcome the opportunity to discuss"
- No opener like "I hope this finds you well", "My name is X and I am reaching out because"
- Keep it to 4-6 sentences. Short messages get read. Long ones get skipped.

Return ONLY valid JSON, no markdown:
{
  "subject": "Subject line — specific, not generic, ideally feels like it comes from someone they'd want to hear from",
  "message": "Full message body, 4-6 sentences, warm and direct",
  "followUp": "One short, human follow-up line to send 5-7 days later if no reply",
  "timingNote": "One sentence on best timing to send (day, time, signal window)",
  "whyItWorks": "One sentence on why this lands better than a generic application"
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
