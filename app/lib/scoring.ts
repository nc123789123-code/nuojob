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
  {
    keywords: ["direct lending", "direct lend"],
    strategy: "direct_lending",
    label: "Direct Lending",
  },
  {
    keywords: [
      "private credit",
      "private debt",
      "credit opportunities",
      "credit opportunity",
    ],
    strategy: "private_credit",
    label: "Private Credit",
  },
  {
    keywords: [
      "special situations",
      "special sits",
      "opportunistic credit",
      "distressed credit",
    ],
    strategy: "special_sits",
    label: "Special Situations",
  },
  {
    keywords: ["distressed", "distress"],
    strategy: "distressed",
    label: "Distressed",
  },
  {
    keywords: ["mezzanine", "mezz"],
    strategy: "mezzanine",
    label: "Mezzanine",
  },
  {
    keywords: ["long/short", "long short", "equity long"],
    strategy: "long_short",
    label: "Long/Short Equity",
  },
  {
    keywords: ["macro", "global macro"],
    strategy: "macro",
    label: "Global Macro",
  },
  {
    keywords: ["quant", "quantitative", "systematic"],
    strategy: "quant",
    label: "Quantitative",
  },
  {
    keywords: [
      "multi-strategy",
      "multi strategy",
      "multistrategy",
      "multi strat",
    ],
    strategy: "multi_strategy",
    label: "Multi-Strategy",
  },
  {
    keywords: [
      "hedge fund",
      "master fund",
      "feeder fund",
      "offshore fund",
      "cayman",
    ],
    strategy: "hedge_fund",
    label: "Hedge Fund",
  },
];

export function detectStrategy(name: string): {
  strategy: FundStrategy;
  label: string;
} {
  const lower = (name || "").toLowerCase();

  for (const { keywords, strategy, label } of STRATEGY_PATTERNS) {
    if (keywords.some((k) => lower.includes(k))) {
      return { strategy, label };
    }
  }

  // Heuristic fallbacks
  if (/credit/i.test(name)) return { strategy: "private_credit", label: "Credit" };
  if (/fund (lp|llc|ltd)/i.test(name) || /partners (lp|llc)/i.test(name)) {
    return { strategy: "hedge_fund", label: "Hedge Fund" };
  }

  return { strategy: "other", label: "Fund" };
}

// ─── Recency multiplier ───────────────────────────────────────────────────────

export function recencyMultiplier(days: number): number {
  if (days <= 30) return 1.0;
  if (days <= 90) return 0.8;
  if (days <= 180) return 0.6;
  if (days <= 365) return 0.35;
  return 0.1;
}

export function getDaysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  );
}

// ─── Core scoring ─────────────────────────────────────────────────────────────

export function scoreFiling(
  filing: Omit<FundFiling, "score" | "daysSinceFiling" | "strategy" | "strategyLabel">,
  prefetched?: { expansionSignals?: Signal[]; expansionScore?: number }
): FundScore {
  const days = getDaysSince(filing.fileDate);
  const rm = recencyMultiplier(days);
  const signals: Signal[] = [];

  // ── Fundraising score ──────────────────────────────────────────────────────
  let fundraisingRaw = 0;
  const isAmendment = filing.formType === "D/A";

  if (!isAmendment) {
    fundraisingRaw += 30;
    signals.push({
      type: "form_d_new",
      description: `New Form D filed ${days} day${days !== 1 ? "s" : ""} ago`,
      date: filing.fileDate,
      source: "SEC EDGAR",
      weight: 30,
    });
  } else {
    fundraisingRaw += 10;
    signals.push({
      type: "form_d_amendment",
      description: `Form D amendment filed ${days} day${days !== 1 ? "s" : ""} ago`,
      date: filing.fileDate,
      source: "SEC EDGAR",
      weight: 10,
    });
  }

  // Offering still open = actively raising
  if (filing.offeringStatus === "open") {
    fundraisingRaw += 20;
    signals.push({
      type: "form_d_open",
      description: "Offering still open — likely mid-raise",
      date: filing.fileDate,
      source: "SEC EDGAR",
      weight: 20,
    });
  } else if (filing.offeringStatus === "closed") {
    fundraisingRaw += 15;
    signals.push({
      type: "form_d_closed",
      description: "Offering closed — recently raised capital, likely deploying",
      date: filing.fileDate,
      source: "SEC EDGAR",
      weight: 15,
    });
  }

  // Large offering size signal
  if (filing.totalOfferingAmount && filing.totalOfferingAmount >= 100_000_000) {
    fundraisingRaw += 10;
    signals.push({
      type: "large_offering",
      description: `Large offering: ${formatM(filing.totalOfferingAmount)} target`,
      date: filing.fileDate,
      source: "SEC EDGAR",
      weight: 10,
    });
  }

  // Near / at target (high conviction)
  if (filing.totalOfferingAmount && filing.totalAmountSold) {
    const pct = filing.totalAmountSold / filing.totalOfferingAmount;
    if (pct >= 0.5 && pct < 1.0) {
      fundraisingRaw += 10;
      signals.push({
        type: "near_target",
        description: `${Math.round(pct * 100)}% raised toward target — near close`,
        date: filing.fileDate,
        source: "SEC EDGAR",
        weight: 10,
      });
    }
  }

  const fundraisingScore = Math.min(100, Math.round(fundraisingRaw * rm));

  // ── Hiring score (placeholder — wire to careers scraper in Phase 2) ─────────
  const hiringScore = 0;

  // ── Expansion score — NewsAPI signals if available ────────────────────────
  const expansionScore = prefetched?.expansionScore ?? 0;
  if (prefetched?.expansionSignals?.length) {
    signals.push(...prefetched.expansionSignals);
  }

  // ── Overall weighted score ─────────────────────────────────────────────────
  // 0.45 * fundraising + 0.35 * hiring + 0.20 * expansion
  const overallScore = Math.round(
    0.45 * fundraisingScore + 0.35 * hiringScore + 0.20 * expansionScore
  );

  // ── Bucket ─────────────────────────────────────────────────────────────────
  const bucket: RaiseBucket =
    overallScore >= 80
      ? "hot"
      : overallScore >= 60
      ? "warm"
      : overallScore >= 40
      ? "watch"
      : "low";

  // ── Confidence (only EDGAR data in MVP = Medium) ───────────────────────────
  const confidence =
    signals.length >= 3 ? "medium" : signals.length >= 2 ? "medium" : "low";

  // ── Why now bullets ────────────────────────────────────────────────────────
  const whyNow: string[] = [];
  whyNow.push(`Form ${filing.formType} filed ${days} day${days !== 1 ? "s" : ""} ago`);
  if (filing.totalAmountSold && filing.totalAmountSold > 0) {
    whyNow.push(
      `${formatM(filing.totalAmountSold)} raised${
        filing.totalOfferingAmount
          ? ` of ${formatM(filing.totalOfferingAmount)} target`
          : ""
      }`
    );
  } else if (filing.totalOfferingAmount) {
    whyNow.push(`${formatM(filing.totalOfferingAmount)} target offering`);
  }
  if (filing.offeringStatus === "open") {
    whyNow.push("Offering open — actively fundraising");
  } else if (filing.offeringStatus === "closed") {
    whyNow.push("Offering closed — capital deployed / team build-out likely");
  }
  if (filing.dateOfFirstSale) {
    const firstDays = getDaysSince(filing.dateOfFirstSale);
    whyNow.push(`First sale ${firstDays} day${firstDays !== 1 ? "s" : ""} ago`);
  }
  if (filing.state) {
    whyNow.push(`${filing.state}-based fund`);
  }

  // ── Suggested angle ────────────────────────────────────────────────────────
  const suggestedAngle =
    filing.offeringStatus === "open"
      ? `Congrats on the recent fund momentum — would love to discuss talent needs as you build out the team mid-raise.`
      : `Congrats on the close — as you deploy capital and scale the portfolio, happy to discuss your investment team build.`;

  // ── Suggested target teams ─────────────────────────────────────────────────
  const suggestedTargetTeams = [
    "Investment team",
    "Capital formation / IR",
    "COO / Chief of Staff",
    "Portfolio Operations",
  ];

  return {
    fundraisingScore,
    hiringScore,
    expansionScore,
    recencyMultiplier: rm,
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

// Export for use in API
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
  const rm = recencyMultiplier(days);
  const signals: Signal[] = [];

  const { stage, label: stageLabel } = inferStage(filing.totalAmountSold ?? filing.totalOfferingAmount);

  // ── Funding score ──────────────────────────────────────────────────────────
  let fundingRaw = 0;
  const isAmendment = filing.formType === "D/A";

  if (!isAmendment) {
    fundingRaw += 35;
    signals.push({
      type: "form_d_new",
      description: `Form D filed ${days} day${days !== 1 ? "s" : ""} ago — equity raise`,
      date: filing.fileDate,
      source: "SEC EDGAR",
      weight: 35,
    });
  } else {
    fundingRaw += 12;
    signals.push({
      type: "form_d_amendment",
      description: `Form D amendment filed ${days} day${days !== 1 ? "s" : ""} ago`,
      date: filing.fileDate,
      source: "SEC EDGAR",
      weight: 12,
    });
  }

  // Offering open = actively raising
  if (filing.offeringStatus === "open") {
    fundingRaw += 20;
    signals.push({
      type: "form_d_open",
      description: "Offering open — round actively in progress",
      date: filing.fileDate,
      source: "SEC EDGAR",
      weight: 20,
    });
  } else if (filing.offeringStatus === "closed") {
    fundingRaw += 18;
    signals.push({
      type: "form_d_closed",
      description: "Funding closed — fresh capital, scaling likely",
      date: filing.fileDate,
      source: "SEC EDGAR",
      weight: 18,
    });
  }

  // Stage bonus — later stage = more validated, more hiring
  const stageBonus: Record<FundingStage, number> = {
    pre_seed: 0, seed: 5, series_a: 12, series_b: 18, series_c: 20, growth: 20, unknown: 0,
  };
  const bonus = stageBonus[stage];
  if (bonus > 0) {
    fundingRaw += bonus;
    signals.push({
      type: "large_offering",
      description: `${stageLabel} round — ${formatM(filing.totalAmountSold ?? filing.totalOfferingAmount ?? 0)} raised`,
      date: filing.fileDate,
      source: "SEC EDGAR",
      weight: bonus,
    });
  }

  const fundingScore = Math.min(100, Math.round(fundingRaw * rm));

  // ── Hiring score (Phase 2 placeholder) ────────────────────────────────────
  const hiringScore = 0;

  // ── Expansion score — NewsAPI ──────────────────────────────────────────────
  const expansionScore = prefetched?.expansionScore ?? 0;
  if (prefetched?.expansionSignals?.length) signals.push(...prefetched.expansionSignals);

  // ── Overall: 50% funding + 30% hiring + 20% expansion ─────────────────────
  const overallScore = Math.round(
    0.50 * fundingScore + 0.30 * hiringScore + 0.20 * expansionScore
  );

  const bucket: RaiseBucket =
    overallScore >= 80 ? "hot" : overallScore >= 60 ? "warm" : overallScore >= 40 ? "watch" : "low";

  const confidence = signals.length >= 3 ? "medium" : signals.length >= 2 ? "medium" : "low";

  // ── Why Now (intuitive, startup style) ────────────────────────────────────
  const whyNow: string[] = [];
  if (filing.totalAmountSold && filing.totalAmountSold > 0) {
    whyNow.push(`${stageLabel} round: ${formatM(filing.totalAmountSold)} raised${days <= 30 ? " recently" : ""}`);
  } else if (filing.totalOfferingAmount) {
    whyNow.push(`${stageLabel} targeting ${formatM(filing.totalOfferingAmount)}`);
  }
  if (filing.offeringStatus === "open") {
    whyNow.push("Round actively open — team build-out imminent");
  } else if (filing.offeringStatus === "closed") {
    whyNow.push("Recent funding closed — active scaling phase");
  }
  if (days <= 30) whyNow.push(`Filed just ${days} day${days !== 1 ? "s" : ""} ago`);
  if (filing.dateOfFirstSale) {
    const firstDays = getDaysSince(filing.dateOfFirstSale);
    if (firstDays <= 60) whyNow.push(`First capital in ${firstDays} day${firstDays !== 1 ? "s" : ""} ago`);
  }
  if (filing.state) whyNow.push(`${filing.state}-based company`);

  const suggestedAngle =
    filing.offeringStatus === "open"
      ? `Congrats on the ${stageLabel} raise — as you close and scale the team, would love to discuss your hiring needs across sales, ops, and finance.`
      : `Congrats on closing the ${stageLabel} — with fresh capital, happy to talk through how we can support your hiring surge.`;

  return {
    fundingScore,
    hiringScore,
    expansionScore,
    recencyMultiplier: rm,
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
