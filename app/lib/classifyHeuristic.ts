/**
 * Heuristic-only job classifier (no Anthropic SDK dependency).
 * Safe to import from edge runtime routes.
 *
 * For LLM-enhanced classification, use app/lib/classify.ts (nodejs only).
 */

export interface JobClassification {
  frontOffice: boolean;
  seniority: "analyst" | "associate" | "vp" | "director" | "md" | "partner" | "intern" | "other";
  strategies: string[];
  signalType: "expansion" | "replacement" | "uncertain";
  relevanceScore: number;
  signal: string;
}

const SENIORITY_MAP: Array<[RegExp, JobClassification["seniority"]]> = [
  [/\b(intern|summer analyst|co-?op|summer associate)\b/i,           "intern"],
  [/\b(jr\.?\s+analyst|junior analyst)\b/i,                          "analyst"],
  [/\b(\banalyst\b)/i,                                                "analyst"],
  [/\b(senior analyst|senior associate)\b/i,                         "associate"],
  [/\b(\bassociate\b)/i,                                              "associate"],
  [/\b(vice president|vp(?!\s*&)|\bvp\b)\b/i,                       "vp"],
  [/\b(director|senior vp|svp|principal)\b/i,                        "director"],
  [/\b(managing director|\bmd\b|head of|cio|cco|cfo|ceo|chief)\b/i, "md"],
  [/\b(partner|general partner|senior partner|co-?head)\b/i,         "partner"],
];

const STRATEGY_PATTERNS: Array<[RegExp, string]> = [
  [/\b(private credit|direct lend|leveraged finance|lev fin|unitranche)\b/i, "private_credit"],
  [/\b(distress|restructur|special situations?|special sits?|credit opportunit)\b/i, "distressed"],
  [/\b(private equity|buyout|lbo|growth equity)\b/i,                "private_equity"],
  [/\b(hedge fund|long.?short|event.?driven)\b/i,                    "hedge_fund"],
  [/\b(macro|global macro|fixed income|rates)\b/i,                   "macro"],
  [/\b(quant|quantitative|systematic|algo)\b/i,                      "quant"],
  [/\b(structured|securiti|abs|mbs|clo)\b/i,                        "structured_credit"],
  [/\b(high yield|investment grade|credit research|credit trading)\b/i, "public_credit"],
];

const BACK_OFFICE_RE = /\b(software engineer|developer|devops|sysadmin|cybersecurity|security engineer|data engineer|machine learning|HR|human resources|recruit|talent|office manager|facilities|executive assistant|admin|receptionist|payroll|legal counsel|paralegal|attorney|general counsel|marketing|content manager|social media|SEO|sales|account executive|business development|customer support|help desk|product manager|project manager|supply chain|procurement)\b/i;

function seniorityFrom(title: string): JobClassification["seniority"] {
  for (const [re, level] of SENIORITY_MAP) {
    if (re.test(title)) return level;
  }
  return "other";
}

function signalFrom(role: string, firm: string): string {
  if (/head of|chief|cio|managing director|\bmd\b|partner/i.test(role)) {
    return `Senior hire at ${firm} — likely team build-out or strategy expansion`;
  }
  if (/director|vp|vice president/i.test(role)) {
    return `Mid-senior opening at ${firm} — team growth signal`;
  }
  if (/distress|restructur|special situations?/i.test(role)) {
    return `${firm} hiring for distressed/special sits — watch for deployment activity`;
  }
  if (/private credit|direct lend/i.test(role)) {
    return `${firm} expanding private credit team — possible new fund deployment`;
  }
  return `${firm} hiring — ${role}`;
}

export function classifyHeuristic(job: { role: string; firm: string }): JobClassification {
  const { role, firm } = job;
  const frontOffice = !BACK_OFFICE_RE.test(role);
  const seniority = seniorityFrom(role);
  const strategies = STRATEGY_PATTERNS.filter(([re]) => re.test(`${role} ${firm}`)).map(([, s]) => s);

  const relevanceScore = !frontOffice ? 2
    : seniority === "md" || seniority === "partner" ? 9
    : seniority === "director" || seniority === "vp" ? 8
    : seniority === "associate" || seniority === "analyst" ? 7
    : 5;

  return {
    frontOffice,
    seniority,
    strategies,
    signalType: ["md", "partner", "director"].includes(seniority) ? "expansion" : "uncertain",
    relevanceScore,
    signal: signalFrom(role, firm),
  };
}
