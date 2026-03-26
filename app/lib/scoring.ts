import {
  FundFiling,
  FundScore,
  RaiseBucket,
  Signal,
  FundStrategy,
  StartupFiling,
  StartupScore,
  FundingStage,
} from "@/app/types";

// ─── Strategy detection ───────────────────────────────────────────────────────

const STRATEGY_PATTERNS: Array<{
  keywords: string[];
  strategy: FundStrategy;
  label: string;
}> = [
  { keywords: ["direct lending", "direct lend"], strategy: "direct_lending", label: "Direct Lending" },
  { keywords: ["private credit", "private debt", "credit opportunities", "credit opportunity"], strategy: "private_credit", label: "Private Credit" },
  { keywords: ["special situations", "special sits", "opportunistic credit", "distressed credit"], strategy: "special_sits", label: "Special Situations" },
  { keywords: ["distressed", "distress"], strategy: "distressed", label: "Distressed" },
  { keywords: ["mezzanine", "mezz"], strategy: "mezzanine", label: "Mezzanine" },
  { keywords: ["long/short", "long short", "equity long"], strategy: "long_short", label: "Long/Short Equity" },
  { keywords: ["macro", "global macro"], strategy: "macro", label: "Global Macro" },
  { keywords: ["quant", "quantitative", "systematic"], strategy: "quant", label: "Quantitative" },
  { keywords: ["multi-strategy", "multi strategy", "multistrategy", "multi strat"], strategy: "multi_strategy", label: "Multi-Strategy" },
  { keywords: ["hedge fund", "master fund", "feeder fund", "offshore fund", "cayman"], strategy: "hedge_fund", label: "Hedge Fund" },
];

export function detectStrategy(name: string): { strategy: FundStrategy; label: string } {
  const lower = (name || "").toLowerCase();
  for (const { keywords, strategy, label } of STRATEGY_PATTERNS) {
    if (keywords.some((k) => lower.includes(k))) return { strategy, label };
  }
  if (/credit/i.test(name)) return { strategy: "private_credit", label: "Credit" };
  if (/fund (lp|llc|ltd)/i.test(name) || /partners (lp|llc)/i.test(name)) return { strategy: "hedge_fund", label: "Hedge Fund" };
  return { strategy: "other", label: "Fund" };
}

// ─── Recency bonus (additive, not multiplicative) ─────────────────────────────

export function recencyBonus(days: number): number {
  if (days <= 7)   return 20;
  if (days <= 30)  return 15;
  if (days <= 90)  return 8;
  if (days <= 180) return 3;
  return 0;
}

// Keep for backwards compat
export function recencyMultiplier(days: number): number {
  if (days <= 30)  return 1.0;
  if (days <= 90)  return 0.8;
  if (days <= 180) return 0.6;
  if (days <= 365) return 0.35;
  return 0.1;
}

export function getDaysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)));
}

// ─── Why Now builder — specific and actionable ────────────────────────────────

function buildFundWhyNow(
  filing: { formType: string; totalOfferingAmount?: number; totalAmountSold?: number; offeringStatus: string; state?: string; dateOfFirstSale?: string },
  days: number
): string[] {
  const whyNow: string[] = [];

  // Primary signal line — combine specifics into one clear sentence
  const parts: string[] = [];

  if (filing.formType === "D/A") {
    parts.push("Form D amendment");
  } else {
    parts.push("New Form D");
  }

  if (filing.totalOfferingAmount) {
    parts.push(`${formatM(filing.totalOfferingAmount)} fund`);
  }

  const recencyLabel = days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
  parts.push(`filed ${recencyLabel}`);

  if (filing.totalAmountSold && filing.totalAmountSold > 0 && filing.totalOfferingAmount) {
    const pct = Math.round((filing.totalAmountSold / filing.totalOfferingAmount) * 100);
    parts.push(`${formatM(filing.totalAmountSold)} raised (${pct}%)`);
  } else if (filing.totalAmountSold && filing.totalAmountSold > 0) {
    parts.push(`${formatM(filing.totalAmountSold)} raised`);
  }

  whyNow.push(parts.join(" · "));

  // Implication — what this means for hiring
  if (filing.offeringStatus === "open") {
    if (filing.totalAmountSold && filing.totalOfferingAmount) {
      const pct = Math.round((filing.totalAmountSold / filing.totalOfferingAmount) * 100);
      if (pct >= 75) {
        whyNow.push(`${pct}% raised → near final close, IR wind-down and investment team expansion likely`);
      } else if (pct >= 50) {
        whyNow.push(`${pct}% raised → mid-raise, IR and deal sourcing hires most urgent now`);
      } else {
        whyNow.push("Actively raising → investor relations and investment team build-out in progress");
      }
    } else {
      whyNow.push("Offering open → actively raising capital, IR and investment team hires likely");
    }
  } else if (filing.offeringStatus === "closed") {
    whyNow.push("Round closed → post-raise team build-out phase, hiring analysts and associates to deploy capital");
  } else {
    whyNow.push("Recent Form D activity → likely fundraising or deploying capital");
  }

  if (filing.dateOfFirstSale) {
    const firstDays = getDaysSince(filing.dateOfFirstSale);
    if (firstDays <= 90) {
      whyNow.push(`First capital received ${firstDays} day${firstDays !== 1 ? "s" : ""} ago`);
    }
  }

  return whyNow;
}

function buildStartupWhyNow(
  filing: { formType: string; totalOfferingAmount?: number; totalAmountSold?: number; offeringStatus: string; state?: string; dateOfFirstSale?: string },
  days: number,
  stageLabel: string
): string[] {
  const whyNow: string[] = [];

  const amount = filing.totalAmountSold ?? filing.totalOfferingAmount;
  const recencyLabel = days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;

  const parts: string[] = [];
  if (amount) {
    parts.push(`${stageLabel} · ${formatM(amount)}`);
  } else {
    parts.push(stageLabel);
  }
  parts.push(`filed ${recencyLabel}`);
  if (filing.offeringStatus === "open") parts.push("raising now");
  else if (filing.offeringStatus === "closed") parts.push("closed");
  whyNow.push(parts.join(" · "));

  if (filing.offeringStatus === "open") {
    whyNow.push("Round in progress → leadership and go-to-market hires typically begin now");
  } else if (filing.offeringStatus === "closed") {
    whyNow.push("Funding closed → scaling phase, high-velocity hiring across sales, finance, and engineering");
  } else {
    whyNow.push("Recent equity raise → growth and team expansion likely underway");
  }

  if (filing.dateOfFirstSale) {
    const firstDays = getDaysSince(filing.dateOfFirstSale);
    if (firstDays <= 60) {
      whyNow.push(`First capital in ${firstDays} day${firstDays !== 1 ? "s" : ""} ago`);
    }
  }

  return whyNow;
}

// ─── Core scoring — ADDITIVE system ──────────────────────────────────────────
//
// Target ranges:
//   Hot   ≥ 70  (top opportunities, fresh + strong signal)
//   Warm  ≥ 50  (solid opportunities, 1–3 months old or weaker signal)
//   Watch ≥ 30  (worth monitoring)
//   Low   < 30  (weak signal, old, or incomplete data)
//
// Max additive score: 35+25+20+10+20 = 110 → capped at 100
// ──────────────────────────────────────────────────────────────────────────────

export function scoreFiling(
  filing: Omit<FundFiling, "score" | "daysSinceFiling" | "strategy" | "strategyLabel">,
  prefetched?: { expansionSignals?: Signal[]; expansionScore?: number }
): FundScore {
  const days = getDaysSince(filing.fileDate);
  const signals: Signal[] = [];
  let score = 0;

  // ── 1. Form type base ──────────────────────────────────────────────────────
  const isAmendment = filing.formType === "D/A";
  if (!isAmendment) {
    score += 35;
    signals.push({ type: "form_d_new", description: `New Form D filed ${days} day${days !== 1 ? "s" : ""} ago`, date: filing.fileDate, source: "SEC EDGAR", weight: 35 });
  } else {
    score += 15;
    signals.push({ type: "form_d_amendment", description: `Form D amendment filed ${days} day${days !== 1 ? "s" : ""} ago`, date: filing.fileDate, source: "SEC EDGAR", weight: 15 });
  }

  // ── 2. Offering status ────────────────────────────────────────────────────
  if (filing.offeringStatus === "open") {
    score += 25;
    signals.push({ type: "form_d_open", description: "Offering open — actively raising capital", date: filing.fileDate, source: "SEC EDGAR", weight: 25 });
  } else if (filing.offeringStatus === "closed") {
    score += 20;
    signals.push({ type: "form_d_closed", description: "Offering closed — capital recently raised, team build-out phase", date: filing.fileDate, source: "SEC EDGAR", weight: 20 });
  }

  // ── 3. Fund size ──────────────────────────────────────────────────────────
  const offeringAmt = filing.totalOfferingAmount;
  if (offeringAmt && offeringAmt >= 500_000_000) {
    score += 20;
    signals.push({ type: "very_large_offering", description: `Very large fund: ${formatM(offeringAmt)} target`, date: filing.fileDate, source: "SEC EDGAR", weight: 20 });
  } else if (offeringAmt && offeringAmt >= 100_000_000) {
    score += 12;
    signals.push({ type: "large_offering", description: `Large fund: ${formatM(offeringAmt)} target`, date: filing.fileDate, source: "SEC EDGAR", weight: 12 });
  } else if (offeringAmt && offeringAmt >= 10_000_000) {
    score += 5;
    signals.push({ type: "medium_offering", description: `Fund size: ${formatM(offeringAmt)}`, date: filing.fileDate, source: "SEC EDGAR", weight: 5 });
  }

  // ── 4. Near target ────────────────────────────────────────────────────────
  if (filing.totalOfferingAmount && filing.totalAmountSold) {
    const pct = filing.totalAmountSold / filing.totalOfferingAmount;
    if (pct >= 0.5 && pct < 1.0) {
      score += 10;
      signals.push({ type: "near_target", description: `${Math.round(pct * 100)}% raised toward target — approaching close`, date: filing.fileDate, source: "SEC EDGAR", weight: 10 });
    }
  }

  // ── 5. Recency bonus ──────────────────────────────────────────────────────
  const rb = recencyBonus(days);
  if (rb > 0) {
    score += rb;
    signals.push({ type: "recency", description: `Filed ${days === 0 ? "today" : `${days} day${days !== 1 ? "s" : ""} ago`}`, date: filing.fileDate, source: "SEC EDGAR", weight: rb });
  }

  // ── 6. News / expansion ───────────────────────────────────────────────────
  const expansionScore = prefetched?.expansionScore ?? 0;
  const expansionContrib = expansionScore > 0 ? Math.round(expansionScore * 0.10) : 0;
  if (expansionContrib > 0) {
    score += expansionContrib;
    if (prefetched?.expansionSignals?.length) signals.push(...prefetched.expansionSignals);
  }

  const fundraisingScore = parseFloat((Math.min(100, score) / 10).toFixed(1));
  const overallScore = fundraisingScore; // hiring is phase 2; score IS the fundraising signal
  const hiringScore = 0;

  const bucket: RaiseBucket =
    overallScore >= 8 ? "hot" : overallScore >= 6 ? "warm" : overallScore >= 4 ? "watch" : "low";

  const confidence: "high" | "medium" | "low" =
    filing.offeringStatus !== "unknown" && filing.totalOfferingAmount ? "medium" : "low";

  const whyNow = buildFundWhyNow(filing, days);

  const suggestedAngle =
    filing.offeringStatus === "open"
      ? `Congratulations on the raise — as you approach close and scale the team, happy to discuss your investment, IR, and operations hiring.`
      : filing.offeringStatus === "closed"
      ? `Congrats on closing the fund — as you deploy capital and build out the portfolio team, would love to talk through analyst and associate hires.`
      : `Noticed the recent Form D activity — happy to connect on how we can support your team growth.`;

  const suggestedTargetTeams = ["Investment team", "Capital formation / IR", "Portfolio Operations", "COO / Chief of Staff"];

  return {
    fundraisingScore,
    hiringScore,
    expansionScore,
    recencyMultiplier: recencyMultiplier(days),
    overallScore,
    bucket,
    confidence,
    whyNow,
    suggestedAngle,
    suggestedTargetTeams,
    signals,
  };
}

function formatM(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

export { formatM };

// ─── Startup stage inference ──────────────────────────────────────────────────

const STAGE_BRACKETS: Array<{ max: number; stage: FundingStage; label: string }> = [
  { max: 1_000_000,   stage: "pre_seed", label: "Pre-Seed" },
  { max: 5_000_000,   stage: "seed",     label: "Seed" },
  { max: 20_000_000,  stage: "series_a", label: "Series A" },
  { max: 75_000_000,  stage: "series_b", label: "Series B" },
  { max: 250_000_000, stage: "series_c", label: "Series C" },
];

export function inferStage(amount?: number): { stage: FundingStage; label: string } {
  if (!amount) return { stage: "unknown", label: "Unknown" };
  for (const b of STAGE_BRACKETS) {
    if (amount <= b.max) return { stage: b.stage, label: b.label };
  }
  return { stage: "growth", label: "Growth" };
}

// ─── Startup scoring ──────────────────────────────────────────────────────────

export function scoreStartup(
  filing: Omit<StartupFiling, "score" | "daysSinceFiling" | "stage" | "stageLabel">,
  prefetched?: { expansionSignals?: Signal[]; expansionScore?: number }
): StartupScore {
  const days = getDaysSince(filing.fileDate);
  const signals: Signal[] = [];
  let score = 0;

  const { stage, label: stageLabel } = inferStage(filing.totalAmountSold ?? filing.totalOfferingAmount);

  // ── 1. Form type ──────────────────────────────────────────────────────────
  const isAmendment = filing.formType === "D/A";
  if (!isAmendment) {
    score += 35;
    signals.push({ type: "form_d_new", description: `Equity Form D filed ${days} day${days !== 1 ? "s" : ""} ago`, date: filing.fileDate, source: "SEC EDGAR", weight: 35 });
  } else {
    score += 15;
    signals.push({ type: "form_d_amendment", description: `Form D amendment filed ${days} day${days !== 1 ? "s" : ""} ago`, date: filing.fileDate, source: "SEC EDGAR", weight: 15 });
  }

  // ── 2. Offering status ────────────────────────────────────────────────────
  if (filing.offeringStatus === "open") {
    score += 22;
    signals.push({ type: "form_d_open", description: "Round actively in progress — team build expected soon", date: filing.fileDate, source: "SEC EDGAR", weight: 22 });
  } else if (filing.offeringStatus === "closed") {
    score += 20;
    signals.push({ type: "form_d_closed", description: "Round closed — fresh capital, scaling phase", date: filing.fileDate, source: "SEC EDGAR", weight: 20 });
  }

  // ── 3. Stage bonus ────────────────────────────────────────────────────────
  const stageBonus: Record<FundingStage, number> = {
    pre_seed: 0, seed: 5, series_a: 12, series_b: 18, series_c: 20, growth: 20, unknown: 0,
  };
  const bonus = stageBonus[stage];
  if (bonus > 0) {
    score += bonus;
    const amount = filing.totalAmountSold ?? filing.totalOfferingAmount;
    signals.push({ type: "large_offering", description: `${stageLabel} round${amount ? ` — ${formatM(amount)} raised` : ""}`, date: filing.fileDate, source: "SEC EDGAR", weight: bonus });
  }

  // ── 4. Recency bonus ──────────────────────────────────────────────────────
  const rb = recencyBonus(days);
  if (rb > 0) {
    score += rb;
    signals.push({ type: "recency", description: `Filed ${days === 0 ? "today" : `${days} day${days !== 1 ? "s" : ""} ago`}`, date: filing.fileDate, source: "SEC EDGAR", weight: rb });
  }

  // ── 5. Expansion ──────────────────────────────────────────────────────────
  const expansionScore = prefetched?.expansionScore ?? 0;
  if (expansionScore > 0) {
    score += Math.round(expansionScore * 0.08);
    if (prefetched?.expansionSignals?.length) signals.push(...prefetched.expansionSignals);
  }

  const fundingScore = parseFloat((Math.min(100, score) / 10).toFixed(1));
  const overallScore = fundingScore;
  const hiringScore = 0;

  const bucket: RaiseBucket =
    overallScore >= 8 ? "hot" : overallScore >= 6 ? "warm" : overallScore >= 4 ? "watch" : "low";

  const confidence: "high" | "medium" | "low" =
    filing.offeringStatus !== "unknown" ? "medium" : "low";

  const whyNow = buildStartupWhyNow(filing, days, stageLabel);

  const suggestedAngle =
    filing.offeringStatus === "open"
      ? `Congrats on the ${stageLabel} raise — as you close and scale the team, would love to discuss your hiring needs across sales, ops, and finance.`
      : `Congrats on closing the ${stageLabel} — with fresh capital, happy to talk through how we can support your hiring surge.`;

  return {
    fundingScore,
    hiringScore,
    expansionScore,
    recencyMultiplier: recencyMultiplier(days),
    overallScore,
    bucket,
    confidence,
    whyNow,
    suggestedAngle,
    signals,
    stage,
    stageLabel,
  };
}

// ─── Role inference for Market Hiring tab ─────────────────────────────────────

import { JobCategory, JobSignalTag } from "@/app/types";

const STRATEGY_ROLES: Record<string, Array<{ role: string; category: JobCategory }>> = {
  private_credit:  [{ role: "Credit Analyst", category: "Private Credit" }, { role: "Underwriting Associate", category: "Private Credit" }],
  direct_lending:  [{ role: "Direct Lending Analyst", category: "Private Credit" }, { role: "Portfolio Manager (Loans)", category: "Private Credit" }],
  special_sits:    [{ role: "Special Situations Analyst", category: "Private Credit" }, { role: "Investment Associate", category: "Private Credit" }],
  distressed:      [{ role: "Distressed Debt Analyst", category: "Private Credit" }, { role: "Restructuring Associate", category: "Private Credit" }],
  mezzanine:       [{ role: "Mezzanine Analyst", category: "Private Credit" }],
  hedge_fund:      [{ role: "Equity Analyst", category: "Equity Investing" }, { role: "Portfolio Manager", category: "Equity Investing" }],
  long_short:      [{ role: "Long/Short Equity Analyst", category: "Equity Research" }, { role: "Sector Specialist", category: "Equity Investing" }],
  macro:           [{ role: "Macro Analyst", category: "Equity Investing" }, { role: "Fixed Income PM", category: "Public Credit" }],
  quant:           [{ role: "Quantitative Researcher", category: "Quant" }, { role: "Systematic Trader", category: "Quant" }],
  multi_strategy:  [{ role: "Investment Analyst", category: "Equity Investing" }, { role: "Credit Analyst", category: "Private Credit" }],
  other:           [{ role: "Investment Analyst", category: "Equity Investing" }],
};

export function inferJobRoles(strategy: string, offeringStatus: string): Array<{ role: string; category: JobCategory }> {
  const base = STRATEGY_ROLES[strategy] ?? STRATEGY_ROLES.other;
  // Active raise = also needs IR
  if (offeringStatus === "open") {
    return [...base, { role: "Investor Relations Manager", category: "IR / Ops" }];
  }
  return base;
}

export function inferJobSignalTag(offeringStatus: string, formType: string): JobSignalTag {
  if (offeringStatus === "open") return "In-market raise";
  if (offeringStatus === "closed") return "Post-raise build-out";
  if (formType === "D/A") return "Fund scaling";
  return "New fund";
}

// ─── Job signal scoring ────────────────────────────────────────────────────────
//
// Factors (max 115, normalized to 0-100):
//   Source quality:   Direct firm pages (gh/lever) = 40 pts, job boards = 20, EDGAR = 15
//   Recency:          0d = 30, ≤3d = 25, ≤7d = 20, ≤14d = 15, ≤30d = 10, older = 5
//   Seniority:        MD/Partner/Head/CIO = 30, Director/VP/Senior = 20, Analyst/Assoc = 10, other = 5
//   Signal tag:       In-market raise = 15, Post-raise build-out = 10, Fund scaling/New fund = 5
//
// ─────────────────────────────────────────────────────────────────────────────

export function scoreJobSignal(job: {
  id: string;
  daysAgo: number;
  signalTag: JobSignalTag;
  role: string;
}): number {
  let s = 0;

  // Source quality
  if (job.id.startsWith("gh-") || job.id.startsWith("lever-")) s += 40;
  else if (job.id.startsWith("edgar-")) s += 15;
  else s += 20;

  // Recency
  if (job.daysAgo === 0)       s += 30;
  else if (job.daysAgo <= 3)   s += 25;
  else if (job.daysAgo <= 7)   s += 20;
  else if (job.daysAgo <= 14)  s += 15;
  else if (job.daysAgo <= 30)  s += 10;
  else                         s += 5;

  // Seniority
  if (/\b(managing director|md|partner|cio|coo|cfo|chief|head of|head,)\b/i.test(job.role)) s += 30;
  else if (/\b(director|vice president|\bvp\b|senior|principal)\b/i.test(job.role))          s += 20;
  else if (/\b(analyst|associate)\b/i.test(job.role))                                         s += 10;
  else                                                                                         s += 5;

  // Signal urgency
  if (job.signalTag === "In-market raise")      s += 15;
  else if (job.signalTag === "Post-raise build-out") s += 10;
  else                                            s += 5;

  return Math.min(100, s);
}
