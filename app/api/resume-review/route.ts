export const runtime = "nodejs";
export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";

export interface ReviewCategory {
  name: string;
  score: number; // 0-100
  feedback: string;
  fixes: string[];
}

export interface ResumeReview {
  overallScore: number;
  headline: string;
  targetRole: string;
  categories: ReviewCategory[];
  topFixes: string[];
  strengths: string[];
  generatedAt: string;
}

export async function POST(req: Request) {
  let body: { resume: string; targetRole?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { resume, targetRole } = body;
  if (!resume || resume.trim().length < 100) {
    return Response.json({ error: "Resume text too short — paste the full content" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

  try {
    const client = new Anthropic({ apiKey });

    const roleContext = targetRole ? `The candidate is targeting: ${targetRole}.` : "Assume the candidate is targeting buyside roles (private credit, PE, hedge fund, or direct lending).";

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2500,
      messages: [{
        role: "user",
        content: `You are a senior buyside recruiter and former investment professional who has reviewed hundreds of finance resumes at top-tier funds. You give blunt, specific, actionable feedback.

${roleContext}

Analyze this resume and return a JSON review. Be honest — most resumes have real problems. Don't be encouraging for its own sake.

RESUME:
"""
${resume.slice(0, 6000)}
"""

STRICT RULES:
- Be specific — quote or reference actual content from the resume in your feedback
- Finance resumes are judged on: deal experience with metrics, outcome-driven bullets, proper formatting conventions, and role signal
- Return ONLY valid JSON, no markdown, no comments

Return this exact JSON structure:
{
  "overallScore": <integer 0-100>,
  "headline": "<one sharp sentence: what's the single biggest strength and biggest weakness>",
  "targetRole": "<inferred target role based on background>",
  "categories": [
    {
      "name": "Deal Experience & Metrics",
      "score": <0-100>,
      "feedback": "<2-3 sentences: specific observations about how deal experience is presented, what's missing>",
      "fixes": ["<concrete fix 1>", "<concrete fix 2>"]
    },
    {
      "name": "Bullet Quality & Outcomes",
      "score": <0-100>,
      "feedback": "<2-3 sentences: are bullets outcome-driven or duty lists? give a specific example from the resume>",
      "fixes": ["<concrete fix 1>", "<concrete fix 2>"]
    },
    {
      "name": "Finance Conventions",
      "score": <0-100>,
      "feedback": "<2-3 sentences: formatting, length, standard finance resume rules — what's right and wrong>",
      "fixes": ["<concrete fix 1>", "<concrete fix 2>"]
    },
    {
      "name": "Role Signal & Positioning",
      "score": <0-100>,
      "feedback": "<2-3 sentences: does the resume clearly signal the target role? what's confusing or misaligned?>",
      "fixes": ["<concrete fix 1>", "<concrete fix 2>"]
    }
  ],
  "topFixes": ["<most impactful fix>", "<second most impactful fix>", "<third most impactful fix>"],
  "strengths": ["<genuine strength 1>", "<genuine strength 2>"]
}`,
      }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const json = JSON.parse(jsonMatch[0]);
    const result: ResumeReview = { ...json, generatedAt: new Date().toISOString() };
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
