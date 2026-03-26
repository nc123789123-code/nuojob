"use client";

import { useState } from "react";
import { JobSignal, JobCategory, JobSignalTag } from "@/app/types";
import SignalBadge, { SignalBadgeVariant } from "./SignalBadge";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function agoLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

function sourceLabel(id: string): { label: string; style: string; isDirect: boolean } {
  if (id.startsWith("gh-"))     return { label: "Greenhouse",  style: "bg-emerald-50 text-emerald-700 border-emerald-200", isDirect: true  };
  if (id.startsWith("lever-"))  return { label: "Lever",       style: "bg-teal-50 text-teal-700 border-teal-200",          isDirect: true  };
  if (id.startsWith("edgar-"))  return { label: "EDGAR",       style: "bg-gray-50 text-gray-500 border-gray-200",          isDirect: false };
  if (id.startsWith("adzuna-")) return { label: "Adzuna",      style: "bg-blue-50 text-blue-700 border-blue-200",          isDirect: false };
  if (id.startsWith("muse-"))   return { label: "The Muse",    style: "bg-purple-50 text-purple-700 border-purple-200",    isDirect: false };
  return                               { label: "Board",        style: "bg-gray-50 text-gray-500 border-gray-200",          isDirect: false };
}

const CATEGORY_BAR: Record<JobCategory, string> = {
  "Private Credit":     "bg-blue-600",
  "Public Credit":      "bg-sky-500",
  "Equity Research":    "bg-violet-500",
  "Equity Investing":   "bg-indigo-500",
  "Investment Banking": "bg-amber-500",
  "Quant":              "bg-pink-500",
  "IR / Ops":           "bg-emerald-500",
};

const CATEGORY_BADGE: Record<JobCategory, string> = {
  "Private Credit":     "bg-blue-50 text-blue-700 border-blue-100",
  "Public Credit":      "bg-sky-50 text-sky-700 border-sky-100",
  "Equity Research":    "bg-violet-50 text-violet-700 border-violet-100",
  "Equity Investing":   "bg-indigo-50 text-indigo-700 border-indigo-100",
  "Investment Banking": "bg-amber-50 text-amber-700 border-amber-100",
  "Quant":              "bg-pink-50 text-pink-700 border-pink-100",
  "IR / Ops":           "bg-emerald-50 text-emerald-700 border-emerald-100",
};

// ─── Intelligence badge derivation ────────────────────────────────────────────

function deriveIntelBadges(signal: JobSignal): SignalBadgeVariant[] {
  const badges: SignalBadgeVariant[] = [];
  const src = sourceLabel(signal.id);

  if (signal.score >= 75 && signal.signalTag !== "New fund") badges.push("high-signal");
  if (signal.signalTag === "Post-raise build-out") badges.push("buildout");
  if (signal.signalTag === "In-market raise") badges.push("raising");
  if (signal.daysAgo <= 3) badges.push("fresh");
  if (src.isDirect) badges.push("direct");
  if (signal.id.startsWith("edgar-")) badges.push("inferred");
  if (signal.category === "Equity Investing" && (signal.signalTag === "Post-raise build-out" || signal.signalTag === "Fund scaling")) badges.push("buyside-preferred");

  return badges.slice(0, 3); // cap at 3 badges to keep it clean
}

// ─── Template-based intelligence generation ───────────────────────────────────

interface RoleAnalysis {
  roleReality: string;
  whatTheyCareAbout: string[];
  hiddenSignals: string[];
  interviewFocus: string;
  worthApplying: { verdict: "strong" | "good" | "moderate" | "low"; text: string };
}

function generateAnalysis(signal: JobSignal): RoleAnalysis {
  const { category, signalTag, score, id, firm, daysAgo } = signal;
  const isDirectPosting = id.startsWith("gh-") || id.startsWith("lever-");
  const isEDGAR = id.startsWith("edgar-");

  // ── Role Reality ──
  const roleReality = ((): string => {
    const buildout = signalTag === "Post-raise build-out";
    const raising  = signalTag === "In-market raise";
    const scaling  = signalTag === "Fund scaling";

    if (category === "Private Credit") {
      if (buildout) return `Newly created private credit seat following a fund close at ${firm}. Typically means direct origination exposure from day one with real IC visibility — not a backfill inheriting a broken book. Team is likely lean, which translates to faster learning and clear ownership.`;
      if (raising)  return `${firm} appears to be mid-raise. This role likely accelerates once the fund formally closes — apply now to be early, but expect the process to shift once LP commitments are locked.`;
      if (scaling)  return `Established credit platform at ${firm} adding capacity. Likely building out a strategy that's already generating returns, which means proven workflow but a potentially defined mandate.`;
      return `Private credit seat at ${firm}. Expect direct deal exposure and IC visibility depending on fund size and strategy maturity.`;
    }
    if (category === "Public Credit") {
      return `Public credit role at ${firm}. Liquid credit markets — high yield, investment grade, or fixed income trading. Expect a market-driven workflow with daily P&L accountability, macro overlay, and strong emphasis on relative value across the capital structure.`;
    }
    if (category === "Equity Investing") {
      if (buildout) return `Buildout seat at ${firm} following a recent fund close. Expect to cover a sector or strategy with minimal inherited baggage — more autonomy and faster signal-to-PM loop. Typically the best timing to join a new fund.`;
      if (raising)  return `${firm} is in market or recently closed. Hiring is real, but process timing may track the fund close. Get into the pipeline now — don't wait for a job board to surface this.`;
      if (scaling)  return `Growth-phase hire at an established equity shop. The strategy is proven — you're entering a structured team with defined coverage. Less blank-slate autonomy, but clear mentorship and process discipline.`;
      return `Equity investing role at ${firm}. Coverage focus and team structure will depend on fund AUM and strategy — worth clarifying in the screen.`;
    }
    if (category === "Equity Research") {
      return `Coverage analyst role at ${firm}. Sell-side ER titles can be misleading here — this is buy-side context, meaning they want independent research, not consensus synthesis. Model quality and differentiated thesis generation are the real bar.`;
    }
    if (category === "Investment Banking") {
      return `Investment banking role at ${firm}. Expect a deal-flow-driven environment focused on M&A advisory, capital markets execution, or leveraged finance structuring. Hours are demanding — the exit opportunity and deal complexity are the primary filters to evaluate.`;
    }
    if (category === "Quant") {
      return `Systematic strategy role at ${firm}. Most mid-size quant shops run hybrid discretionary-systematic — the real question is research depth vs. execution. If they're posting this externally, they likely need signal generation expertise, not just infrastructure.`;
    }
    if (category === "IR / Ops") {
      return `Infrastructure hire at ${firm}. These roles carry outsized responsibility at emerging managers where you're building systems from scratch. At more established platforms, the work is more defined. Either way, LP relationships and fund reporting are core to the day-to-day.`;
    }
    return `Finance role at ${firm}. Review the posting carefully — context will determine whether this skews investment-side or operational.`;
  })();

  // ── What They Actually Care About ──
  const whatTheyCareAbout = ((): string[] => {
    if (category === "Private Credit") return [
      "Credit process end-to-end: origination call → model → IC memo → monitoring",
      "Memo writing quality — can you construct a standalone credit argument?",
      "Sector depth in their target market (sponsored, direct, structured, distressed)",
      "Coding is a bonus; Excel/model rigor is the baseline",
    ];
    if (category === "Public Credit") return [
      "Relative value framework across the capital structure (senior vs. sub, IG vs. HY)",
      "Market intuition: how do you process macro events into positioning decisions?",
      "Model speed and accuracy under time pressure — intraday decisions are common",
      "Familiarity with credit derivatives (CDS, CLOs, indices) at more sophisticated shops",
    ];
    if (category === "Equity Investing") return [
      "Differentiated view — don't pitch large-cap consensus names",
      "Stock pitch: thesis, variant perception, and bear case clarity",
      "Position sizing logic: why this size, why now, what's the exit",
      "Sector depth or credible generalist breadth at the PM level",
    ];
    if (category === "Equity Research") return [
      "Financial model quality — assumptions, not just mechanics",
      "Written communication: research notes, not just numerical output",
      "Sector expertise or a clear coverage angle",
      "Ability to generate differentiated recommendations vs. consensus",
    ];
    if (category === "Investment Banking") return [
      "Execution ability: deal process management, data room, timeline tracking",
      "Technical fundamentals: LBO, DCF, precedent transactions, comps",
      "Client communication and presentation quality under tight deadlines",
      "Group focus and deal flow — know what they've closed in the last 12 months",
    ];
    if (category === "Quant") return [
      "Signal construction and backtesting methodology (decay analysis, turnover constraints)",
      "Python fluency is table stakes; C++ or Julia may matter depending on shop",
      "Understanding of overfitting risk and out-of-sample validation",
      "Research pipeline quality: reproducible, documented, clean",
    ];
    if (category === "IR / Ops") return [
      "LP reporting experience: DDQ, quarterly letters, capital account statements",
      "Fund accounting familiarity (NAV, management fees, carry structures)",
      "Investor portal or fund admin system exposure (Geneva, Advent, Allvue, etc.)",
      "LP relationship management — tone and accuracy under pressure",
    ];
    return [
      "Finance fundamentals and relevant experience",
      "Communication quality and attention to detail",
      "Industry context and genuine interest in the strategy",
    ];
  })();

  // ── Hidden Signals ──
  const hiddenSignals: string[] = [];
  if (isDirectPosting) {
    hiddenSignals.push(`Posted on ${firm}'s own careers page — no recruiter intermediary. They control the process entirely. A direct LinkedIn reach-out or warm intro can move faster than the formal application funnel.`);
  } else if (isEDGAR) {
    hiddenSignals.push(`Role inferred from recent SEC Form D capital-raise activity at ${firm}. Not formally posted on a job board yet. First-mover advantage is real here — a proactive outreach now beats waiting for a LinkedIn listing.`);
  } else {
    hiddenSignals.push(`Sourced via job aggregator — there may be a recruiter in the loop. A direct firm application typically moves faster and carries more weight with the hiring team.`);
  }
  if (signalTag === "Post-raise build-out") {
    hiddenSignals.push("Capital committed before this role appeared. They're expanding, not backfilling — lower risk the role gets cancelled, and stronger mandate clarity for the incoming hire.");
  }
  if (signalTag === "In-market raise") {
    hiddenSignals.push("Firm may still be in market. Hiring timelines can shift until the fund formally closes. Ask about timing in the first screen.");
  }
  if (daysAgo <= 7) {
    hiddenSignals.push(`Posted ${daysAgo <= 3 ? "very recently" : "within the last week"}. Most candidates haven't found this yet — response rates are meaningfully higher in the first week of a posting.`);
  }

  // ── Likely Interview Focus ──
  const interviewFocus = ((): string => {
    if (category === "Private Credit") return "Expect a case study (credit memo format) with a 2–3 day turnaround. Typical arc: associate/analyst screen → senior associate or PM → final. Key questions: walk through a deal end-to-end, pitch a credit idea, how do you think about downside scenarios in this sector.";
    if (category === "Public Credit") return "Expect a relative value exercise or trade idea presentation. They'll probe your macro framework, how you size positions, and how you'd manage drawdown. Faster-paced process than private credit — decisions often within 2–3 rounds.";
    if (category === "Equity Investing") return "Expect a stock pitch presentation (10–15 min, 1–3 names). Rounds typically: junior screen → senior PM → partner or CIO. They'll stress-test your assumptions hard — know the bear case more thoroughly than the bull.";
    if (category === "Equity Research") return "Stock pitch + model walkthrough + a quick written note (sometimes same-day). Sector-specific deep dive is standard. They'll push hard on where your estimates differ from sell-side consensus and why.";
    if (category === "Investment Banking") return "Technical screens heavy on LBO mechanics, valuation multiples, and accounting. Expect a modeling test (often timed). Behavioral rounds will focus on deal experience, client situations, and how you handle pressure. Know the group's recent deal history cold.";
    if (category === "Quant") return "Technical screen (coding challenge, probability/statistics questions) + research presentation. Expect to walk through a signal you've developed, including decay analysis and backtest methodology. Clean code and scientific rigor matter as much as alpha.";
    if (category === "IR / Ops") return "Process-oriented interviews. They'll ask how you've handled LP reporting deadlines, what you do when numbers don't reconcile, and which fund admin systems you've worked in. Softer interview format than investment-side, but attention to detail is heavily tested.";
    return "Expect a mix of technical and behavioral questions. Prepare a clear narrative on relevant experience and why this firm specifically.";
  })();

  // ── Worth Applying ──
  const worthApplying = ((): RoleAnalysis["worthApplying"] => {
    if (score >= 80) return {
      verdict: "strong",
      text: "Strong signal. Post-directly — don't wait for a recruiter to bring this to you. Competition is low relative to the opportunity quality right now.",
    };
    if (score >= 65) return {
      verdict: "good",
      text: "Worth prioritizing this week. Good signal-to-noise ratio. Do 15 minutes of firm research before reaching out so you can lead with a specific angle.",
    };
    if (score >= 50) return {
      verdict: "moderate",
      text: "Reasonable opportunity. Check recent firm news or SEC filings before applying — more context will sharpen your targeting and cover letter.",
    };
    return {
      verdict: "low",
      text: "Lower signal strength. Not worth a cold application without more research. Look for news on the fund's current raise or strategy before investing time here.",
    };
  })();

  return { roleReality, whatTheyCareAbout, hiddenSignals, interviewFocus, worthApplying };
}

// ─── Analysis Panel ────────────────────────────────────────────────────────────

function AnalysisSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</h4>
      {children}
    </div>
  );
}

function VerdictDot({ verdict }: { verdict: RoleAnalysis["worthApplying"]["verdict"] }) {
  const cls = verdict === "strong" ? "bg-emerald-500" : verdict === "good" ? "bg-blue-500" : verdict === "moderate" ? "bg-amber-400" : "bg-gray-300";
  return <span className={`inline-block w-2 h-2 rounded-full ${cls} mr-2 flex-shrink-0 mt-1`} />;
}

function AnalysisPanel({ signal }: { signal: JobSignal }) {
  const a = generateAnalysis(signal);
  return (
    <div className="border-t border-gray-100 bg-slate-50/60 px-5 py-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-5">
          <AnalysisSection label="Role Reality">
            <p className="text-sm text-gray-700 leading-relaxed">{a.roleReality}</p>
          </AnalysisSection>

          <AnalysisSection label="What They Actually Care About">
            <ul className="space-y-1.5">
              {a.whatTheyCareAbout.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-gray-300 mt-0.5 flex-shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </AnalysisSection>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <AnalysisSection label="Hidden Signals">
            <ul className="space-y-2">
              {a.hiddenSignals.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-400 mt-0.5 flex-shrink-0">↗</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </AnalysisSection>

          <AnalysisSection label="Likely Interview Focus">
            <p className="text-sm text-gray-700 leading-relaxed">{a.interviewFocus}</p>
          </AnalysisSection>

          <AnalysisSection label="Worth Applying?">
            <div className="flex items-start gap-2">
              <VerdictDot verdict={a.worthApplying.verdict} />
              <p className="text-sm text-gray-700 leading-relaxed">{a.worthApplying.text}</p>
            </div>
          </AnalysisSection>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 mt-5 pt-4 border-t border-gray-200">
        OnluIntel analysis · Based on signal source, hiring context, and category patterns · Not AI-generated
      </p>
    </div>
  );
}

// ─── Score badge ───────────────────────────────────────────────────────────────

function ScorePip({ score }: { score: number }) {
  const [bg, text] =
    score >= 80 ? ["bg-red-500", "text-white"] :
    score >= 65 ? ["bg-amber-500", "text-white"] :
    score >= 50 ? ["bg-yellow-400", "text-white"] :
                  ["bg-gray-100", "text-gray-500"];
  return (
    <div className={`w-7 h-7 rounded-md ${bg} flex items-center justify-center flex-shrink-0`}>
      <span className={`font-bold text-[11px] tabular-nums ${text}`}>{score}</span>
    </div>
  );
}

// ─── RoleCard ─────────────────────────────────────────────────────────────────

interface Props {
  signal: JobSignal;
}

export default function RoleCard({ signal }: Props) {
  const [expanded, setExpanded] = useState(false);
  const src = sourceLabel(signal.id);
  const badges = deriveIntelBadges(signal);
  const barColor = CATEGORY_BAR[signal.category];
  const catBadge = CATEGORY_BADGE[signal.category];
  const isApply = !signal.id.startsWith("edgar-");

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden transition-shadow ${expanded ? "shadow-md" : "hover:shadow-sm"}`}>
      {/* Main card row */}
      <div
        className="flex items-stretch cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        aria-expanded={expanded}
      >
        {/* Category accent bar */}
        <div className={`w-1 flex-shrink-0 ${barColor}`} />

        {/* Content */}
        <div className="flex-1 px-4 py-3.5 min-w-0">
          {/* Top row: firm + source + score + badges */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="font-semibold text-gray-900 text-sm">{signal.firm}</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${src.style}`}>{src.label}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <ScorePip score={signal.score} />
              {badges.map((v) => <SignalBadge key={v} variant={v} />)}
            </div>
          </div>

          {/* Role title */}
          <div className="mt-1.5 font-semibold text-gray-800 text-[15px] leading-snug">{signal.role}</div>

          {/* Intel line */}
          {signal.why && (
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
              <span className="text-blue-400 font-medium">→ </span>{signal.why}
            </p>
          )}

          {/* Bottom row: category + location + time + actions */}
          <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${catBadge}`}>
                {signal.category}
              </span>
              {signal.location && signal.location !== "—" && (
                <span className="text-xs text-gray-400">{signal.location}</span>
              )}
              <span className="text-xs text-gray-400 tabular-nums">{agoLabel(signal.daysAgo)}</span>
            </div>
            <div className="flex items-center gap-3">
              {signal.edgarUrl && (
                <a
                  href={signal.edgarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {isApply ? "Apply ↗" : "EDGAR ↗"}
                </a>
              )}
              <span className={`text-[11px] font-medium transition-colors ${expanded ? "text-gray-700" : "text-gray-400 hover:text-gray-600"}`}>
                {expanded ? "Hide analysis ▴" : "View analysis ▾"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable analysis panel */}
      {expanded && <AnalysisPanel signal={signal} />}
    </div>
  );
}
