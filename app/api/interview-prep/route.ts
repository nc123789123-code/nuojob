export const runtime = "nodejs";

import Anthropic from "@anthropic-ai/sdk";

export interface PrepQuestion {
  question: string;
  context: string;
  tip: string;
}

export interface InterviewPrep {
  firm: string;
  strategy: string;
  overview: string;
  culture: string;
  recentDevelopments: string[];
  behavioral: PrepQuestion[];
  technical: PrepQuestion[];
  whatTheyValue: string[];
  redFlags: string[];
  generatedAt: string;
}

async function fetchNews(query: string): Promise<string[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const xml = await res.text();
    const cdata = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)].slice(1, 4).map(m => m[1].trim());
    if (cdata.length > 0) return cdata;
    return [...xml.matchAll(/<title>(.*?)<\/title>/g)].slice(1, 4).map(m => m[1].trim());
  } catch { return []; }
}

// ─── Glassdoor Real-Time API ───────────────────────────────────────────────

interface GDCompany { id?: number; name?: string; shortName?: string; }
interface GDSearchResp { data?: { employers?: GDCompany[] } }

interface GDInterview {
  interviewId?: number;
  jobTitle?: string;
  interviewExperience?: string;
  interviewDifficulty?: string;
  interviewQuestions?: Array<{ question?: string }>;
  howGotInterview?: string;
  overallRating?: number;
}
interface GDInterviewsResp { data?: { interviews?: GDInterview[] } }

async function glassdoorCompanyId(firmName: string, apiKey: string): Promise<number | null> {
  try {
    const p = new URLSearchParams({ query: firmName, limit: "5" });
    const res = await fetch(`https://glassdoor-real-time.p.rapidapi.com/companies/search?${p}`, {
      headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "glassdoor-real-time.p.rapidapi.com" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json() as GDSearchResp;
    const employers = data?.data?.employers ?? [];
    if (!employers.length) return null;
    // Pick best match by name similarity
    const short = firmName.toLowerCase().replace(/\b(lp|llc|ltd|inc|corp|fund|partners|capital|management|advisors?|group)\b/gi, "").trim();
    const match = employers.find(e => (e.name || e.shortName || "").toLowerCase().includes(short)) ?? employers[0];
    return match?.id ?? null;
  } catch { return null; }
}

async function glassdoorInterviews(companyId: number, apiKey: string): Promise<GDInterview[]> {
  try {
    const p = new URLSearchParams({ employerId: String(companyId), limit: "20" });
    const res = await fetch(`https://glassdoor-real-time.p.rapidapi.com/companies/interviews?${p}`, {
      headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "glassdoor-real-time.p.rapidapi.com" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = await res.json() as GDInterviewsResp;
    return data?.data?.interviews ?? [];
  } catch { return []; }
}

function summarizeInterviews(interviews: GDInterview[]): string {
  if (!interviews.length) return "";
  const questions: string[] = [];
  const experiences: string[] = [];

  for (const iv of interviews) {
    for (const q of iv.interviewQuestions ?? []) {
      if (q.question && q.question.length > 10) questions.push(q.question.trim());
    }
    if (iv.interviewExperience) experiences.push(iv.interviewExperience);
  }

  const uniqueQs = [...new Set(questions)].slice(0, 15);
  const expSummary = experiences.length
    ? `Process described as: ${[...new Set(experiences)].slice(0, 5).join(", ")}.`
    : "";

  return [
    uniqueQs.length ? `REAL GLASSDOOR INTERVIEW QUESTIONS (${uniqueQs.length}):\n${uniqueQs.map((q, i) => `${i + 1}. ${q}`).join("\n")}` : "",
    expSummary,
  ].filter(Boolean).join("\n\n");
}

// ──────────────────────────────────────────────────────────────────────────────

const cache = new Map<string, { data: InterviewPrep; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const firm = (searchParams.get("firm") || "").trim();
  const group = (searchParams.get("group") || "").trim();
  if (!firm) return Response.json({ error: "Missing firm name" }, { status: 400 });

  const key = `${firm.toLowerCase()}|${group.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return Response.json(cached.data);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

  const rapidApiKey = process.env.RAPIDAPI_KEY ?? "";

  try {
    const short = firm.replace(/\b(LP|LLC|Ltd|Inc|Corp|Fund|Partners|Capital|Management|Advisors?|Group)\b.*/i, "").trim().slice(0, 40);

    // Fetch news + Glassdoor data in parallel
    const [newsHeadlines, cultureHeadlines, gdCompanyId] = await Promise.all([
      fetchNews(`"${short}" finance investment`),
      fetchNews(`"${short}" culture workplace employees`),
      rapidApiKey ? glassdoorCompanyId(firm, rapidApiKey) : Promise.resolve(null),
    ]);

    // Fetch Glassdoor interviews if we found the company
    const gdInterviews = gdCompanyId && rapidApiKey
      ? await glassdoorInterviews(gdCompanyId, rapidApiKey)
      : [];

    const glassdoorContext = summarizeInterviews(gdInterviews);

    const client = new Anthropic({ apiKey });

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8000,
      messages: [{
        role: "user",
        content: `You are a senior buyside professional. Generate a firm-specific interview prep guide for: "${firm}"${group ? ` — specifically for the ${group} team/group` : ""}

BUSINESS NEWS: ${newsHeadlines.length > 0 ? newsHeadlines.join(" | ") : "none"}
CULTURE NEWS: ${cultureHeadlines.length > 0 ? cultureHeadlines.join(" | ") : "none"}
${glassdoorContext ? `\n${glassdoorContext}\n\nIMPORTANT: Incorporate the real Glassdoor questions above into the behavioral and technical sections where relevant. Label them with "(reported)" if directly using them.` : ""}

STRICT RULES:
- Never name specific individuals
- No fabricated dates or deals
- Be specific to ${firm}'s actual strategy — no generic finance advice
- Keep each string field concise (1-3 sentences max)

Return ONLY valid JSON with NO trailing commas, NO comments:
{
  "firm": "${firm}",
  "strategy": "2 sentences: strategy, AUM, key markets",
  "overview": "3 sentences: what makes them distinctive, investment edge, what succeeds there",
  "culture": "3 sentences: pace, collaboration style, performance expectations",
  "recentDevelopments": ["3 items — 1-2 sentences each: what happened and why it matters for the interview"],
  "behavioral": [
    {
      "question": "firm-specific behavioral question",
      "context": "2 sentences: what they are diagnosing and why this firm cares",
      "tip": "2 sentences: what to lead with and how to close tied to this firm"
    }
  ],
  "technical": [
    {
      "question": "strategy-specific technical question",
      "context": "2 sentences: skill being tested and how it maps to their work",
      "tip": "3 sentences: step-by-step framework, key metrics, what separates good from great"
    }
  ],
  "whatTheyValue": ["4 traits — 1 sentence each: the trait and how it shows up"],
  "redFlags": ["3 items — 1 sentence each: the red flag and what it signals"]
}

5 behavioral, 5 technical. Return only valid JSON.`,
      }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.replace(/```json\n?|\n?```/g, "").trim();
    const json = JSON.parse(raw);
    const result: InterviewPrep = { ...json, generatedAt: new Date().toISOString() };

    cache.set(key, { data: result, ts: Date.now() });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[interview-prep]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
