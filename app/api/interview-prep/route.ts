export const runtime = "nodejs";
export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";

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

const generatePrep = unstable_cache(
  async (firm: string, group: string): Promise<InterviewPrep> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    const rapidApiKey = process.env.RAPIDAPI_KEY ?? "";
    return generatePrepInner(firm, group, apiKey, rapidApiKey);
  },
  ["interview-prep"],
  { revalidate: 86400 } // 24h
);

async function generatePrepInner(firm: string, group: string, apiKey: string, rapidApiKey: string): Promise<InterviewPrep> {
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
      max_tokens: 2500,
      messages: [{
        role: "user",
        content: `You are a senior buyside professional. Generate a firm-specific interview prep guide for: "${firm}"${group ? ` — specifically for the ${group} team/group` : ""}

NEWS: ${newsHeadlines.length > 0 ? newsHeadlines.join(" | ") : "none"}
${glassdoorContext ? `\n${glassdoorContext}\n\nIncorporate real Glassdoor questions where relevant. Label with "(reported)".` : ""}

RULES: No individual names. No fabricated dates/deals. Be specific to ${firm}. Keep all fields SHORT (1-2 sentences max).

Return ONLY valid JSON, no trailing commas:
{
  "firm": "${firm}",
  "strategy": "1-2 sentences: strategy and key markets",
  "overview": "2 sentences: what makes them distinctive and what succeeds there",
  "culture": "2 sentences: pace and performance expectations",
  "recentDevelopments": ["3 items — 1 sentence each"],
  "behavioral": [
    {"question": "firm-specific question","context": "1-2 sentences: what they diagnose","tip": "1-2 sentences: how to answer well"}
  ],
  "technical": [
    {"question": "strategy-specific question","context": "1 sentence: skill tested","tip": "2 sentences: framework and key metric"}
  ],
  "whatTheyValue": ["4 traits — 1 sentence each"],
  "redFlags": ["3 items — 1 sentence each"]
}

3 behavioral, 3 technical. Return only valid JSON.`,
      }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(jsonMatch[0]);
    } catch {
      // Truncated response — strip the last incomplete element and close open structures
      let raw = jsonMatch[0].trimEnd();
      // Remove trailing incomplete string/object/array element
      raw = raw.replace(/,\s*"[^"]*$/, "").replace(/,\s*\{[^}]*$/, "");
      // Close any unclosed arrays/objects
      const opens = (raw.match(/\[/g) || []).length - (raw.match(/\]/g) || []).length;
      const objs  = (raw.match(/\{/g) || []).length - (raw.match(/\}/g) || []).length;
      raw += "]".repeat(Math.max(0, opens)) + "}".repeat(Math.max(0, objs));
      json = JSON.parse(raw);
    }
    const result: InterviewPrep = { ...json, generatedAt: new Date().toISOString() };
    return result;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firm = searchParams.get("firm") || "";
    const group = searchParams.get("group") || "";
    if (!firm.trim()) return Response.json({ error: "firm is required" }, { status: 400 });
    const result = await generatePrep(firm.trim(), group.trim());
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[interview-prep]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
