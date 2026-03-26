/**
 * Job classification pipeline.
 *
 * Two-tier approach:
 *   1. Fast heuristic (always runs, zero latency) — regex-based classification
 *      from title alone. Suitable for real-time requests.
 *
 *   2. Claude enhancement (runs when ANTHROPIC_API_KEY is set) — batches 20 jobs
 *      per API call. Adds richer signal detection, expansion vs. replacement
 *      inference, and a one-sentence "why this matters" for each role.
 *      Results are cached via Next.js fetch for 24 hours.
 *
 * Usage:
 *   const classified = await classifyJobs(rawJobs);
 *   // classified[i].classification is always populated (heuristic or LLM)
 */

import Anthropic from "@anthropic-ai/sdk";
import type { JobSignal } from "@/app/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobClassification {
  frontOffice: boolean;
  seniority: "analyst" | "associate" | "vp" | "director" | "md" | "partner" | "intern" | "other";
  strategies: string[];
  /** expansion = net new headcount, replacement = backfill, uncertain = unknown */
  signalType: "expansion" | "replacement" | "uncertain";
  /** 1 (not relevant) – 10 (must apply) for buyside finance candidates */
  relevanceScore: number;
  /** One-sentence signal insight for display */
  signal: string;
}

// ─── Heuristic classifier ─────────────────────────────────────────────────────

const SENIORITY_MAP: Array<[RegExp, JobClassification["seniority"]]> = [
  [/\b(intern|summer analyst|co-?op|summer associate)\b/i,           "intern"],
  [/\b(jr\.?\s+analyst|junior analyst|research analyst i\b)\b/i,     "analyst"],
  [/\b(\banalyst\b(?!\s+vp))/i,                                       "analyst"],
  [/\b(senior analyst|associate|sr\.?\s+associate)\b/i,               "associate"],
  [/\b(vice president|vp(?!\s*&)|\bvp\b|senior associate)\b/i,        "vp"],
  [/\b(director|senior vp|svp|principal)\b/i,                         "director"],
  [/\b(managing director|\bmd\b|head of|cio|cco|cfo|ceo|chief)\b/i,   "md"],
  [/\b(partner|general partner|senior partner|co-?head)\b/i,          "partner"],
];

const STRATEGY_PATTERNS: Array<[RegExp, string]> = [
  [/\b(private credit|direct lend|leveraged finance|lev fin|unitranche|loan origination)\b/i, "private_credit"],
  [/\b(distress|restructur|special situations?|special sits?|credit opportunit|stressed)\b/i, "distressed"],
  [/\b(private equity|buyout|lbo|growth equity)\b/i,                 "private_equity"],
  [/\b(hedge fund|long.?short|l.?s equity|event.?driven)\b/i,        "hedge_fund"],
  [/\b(macro|global macro|fixed income|rates|fx|forex)\b/i,          "macro"],
  [/\b(quant|quantitative|systematic|algo)\b/i,                       "quant"],
  [/\b(venture|early.?stage|seed invest)\b/i,                         "venture"],
  [/\b(structured|securiti|abs|mbs|clo|cdo)\b/i,                     "structured_credit"],
  [/\b(high yield|investment grade|credit research|credit trading)\b/i, "public_credit"],
];

const BACK_OFFICE_RE = /\b(software engineer|developer|devops|sysadmin|network|cybersecurity|security engineer|data engineer|machine learning|ML engineer|HR|human resources|recruit|talent|office manager|facilities|executive assistant|admin assistant|receptionist|payroll|legal counsel|paralegal|attorney|general counsel|marketing|content manager|social media|SEO|sales manager|account executive|business development|customer success|customer support|help desk|product manager|project manager|scrum master|supply chain|logistics|procurement)\b/i;

function seniorityFrom(title: string): JobClassification["seniority"] {
  for (const [re, level] of SENIORITY_MAP) {
    if (re.test(title)) return level;
  }
  return "other";
}

function strategiesFrom(text: string): string[] {
  return STRATEGY_PATTERNS.filter(([re]) => re.test(text)).map(([, s]) => s);
}

function signalFrom(title: string, firm: string): string {
  if (/head of|chief|cio|managing director|\bmd\b|partner/i.test(title)) {
    return `Senior hire at ${firm} — likely team build-out or strategy expansion`;
  }
  if (/director|vp|vice president/i.test(title)) {
    return `Mid-senior opening at ${firm} — team growth signal`;
  }
  if (/distress|restructur|special situations?/i.test(title)) {
    return `${firm} hiring for distressed/special sits — watch for deployment activity`;
  }
  if (/private credit|direct lend/i.test(title)) {
    return `${firm} expanding private credit team — possible new fund deployment`;
  }
  return `${firm} hiring for ${title}`;
}

export function classifyHeuristic(job: Pick<JobSignal, "role" | "firm">): JobClassification {
  const { role, firm } = job;
  const frontOffice = !BACK_OFFICE_RE.test(role);
  const seniority = seniorityFrom(role);
  const strategies = strategiesFrom(`${role} ${firm}`);
  const relevanceScore = frontOffice
    ? seniority === "md" || seniority === "partner" ? 9
      : seniority === "director" || seniority === "vp" ? 8
      : seniority === "associate" ? 7
      : seniority === "analyst" ? 7
      : 5
    : 2;

  return {
    frontOffice,
    seniority,
    strategies,
    signalType: seniority === "md" || seniority === "partner" || seniority === "director"
      ? "expansion"
      : "uncertain",
    relevanceScore,
    signal: signalFrom(role, firm),
  };
}

// ─── Claude batch classifier ──────────────────────────────────────────────────

const CLAUDE_BATCH = 20;

interface ClaudeJobResult {
  index: number;
  frontOffice: boolean;
  seniority: string;
  strategies: string[];
  signalType: "expansion" | "replacement" | "uncertain";
  relevanceScore: number;
  signal: string;
}

async function classifyWithClaude(
  jobs: Array<Pick<JobSignal, "role" | "firm">>
): Promise<(JobClassification | null)[]> {
  if (!process.env.ANTHROPIC_API_KEY) return jobs.map(() => null);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const results: (JobClassification | null)[] = new Array(jobs.length).fill(null);

  // Process in batches of CLAUDE_BATCH
  for (let i = 0; i < jobs.length; i += CLAUDE_BATCH) {
    const batch = jobs.slice(i, i + CLAUDE_BATCH);
    const jobLines = batch
      .map((j, idx) => `${i + idx}: role="${j.role}" firm="${j.firm}"`)
      .join("\n");

    const prompt = `You are classifying finance job postings for a buy-side intelligence product targeting private credit, distressed, special situations, and hedge fund candidates.

For each job below, return a JSON array. Each element must have:
- index: the number before the colon
- frontOffice: true if the role is an investment/portfolio/research/trading role (not tech/ops/legal/marketing)
- seniority: one of "analyst","associate","vp","director","md","partner","intern","other"
- strategies: array of applicable strategies from ["private_credit","distressed","special_sits","hedge_fund","macro","quant","private_equity","structured_credit","public_credit","growth","other"]
- signalType: "expansion" (net new hire), "replacement" (backfill), or "uncertain"
- relevanceScore: 1-10 for how relevant this is to a buyside finance candidate (10=must see, 1=ignore)
- signal: one sentence explaining what this hire signals about the firm (be concrete, e.g. "KKR is expanding its direct lending team, likely post-close of their 2024 credit fund")

Jobs:
${jobLines}

Return ONLY valid JSON array, no other text.`;

    try {
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });
      const text = msg.content[0].type === "text" ? msg.content[0].text : "";
      // Extract JSON array from response
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) continue;
      const parsed = JSON.parse(match[0]) as ClaudeJobResult[];
      for (const item of parsed) {
        if (item.index >= 0 && item.index < jobs.length) {
          results[item.index] = {
            frontOffice: item.frontOffice ?? false,
            seniority: (item.seniority as JobClassification["seniority"]) ?? "other",
            strategies: item.strategies ?? [],
            signalType: item.signalType ?? "uncertain",
            relevanceScore: item.relevanceScore ?? 5,
            signal: item.signal ?? "",
          };
        }
      }
    } catch {
      // Claude failed for this batch — fall back to heuristics (null results stay null)
    }
  }

  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Classify an array of jobs.
 * Always populates classification for every job (heuristic or LLM).
 * When ANTHROPIC_API_KEY is set, LLM results override heuristics.
 */
export async function classifyJobs(
  jobs: JobSignal[]
): Promise<Array<JobSignal & { classification: JobClassification }>> {
  // Start with heuristics for every job
  const heuristics = jobs.map((j) => classifyHeuristic(j));

  // Attempt LLM enhancement (no-op if no API key)
  const llmResults = await classifyWithClaude(jobs);

  return jobs.map((job, i) => ({
    ...job,
    classification: llmResults[i] ?? heuristics[i],
  }));
}
