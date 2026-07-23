"use client";

import { useState, useEffect } from "react";
import { StartupFiling, OutreachRecord, RaiseBucket, FundingStage } from "@/app/types";

interface Props {
  filing: StartupFiling;
  outreach?: OutreachRecord;
  onOutreachChange: (record: OutreachRecord) => void;
  autoExpand?: boolean;
}

function fmt(amount?: number): string {
  if (!amount) return "—";
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function ago(days: number): string {
  if (days === 0) return "Today";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.round(days / 7)}w`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}

const SCORE_STYLE: Record<RaiseBucket, string> = {
  hot:   "bg-[#2E1620] text-[#FB7185] ring-[#2A2438]",
  warm:  "bg-[#2A2113] text-[#F5B544] ring-[#2A2438]",
  watch: "bg-[#2A2113] text-[#F5B544] ring-[#2A2438]",
  low:   "bg-[#14101E] text-[#9A93AC] ring-[#2A2438]",
};

const STAGE_STYLE: Record<FundingStage, string> = {
  pre_seed: "bg-[#14101E] text-[#9A93AC]",
  seed:     "bg-[#14352A] text-[#5EE6B5]",
  series_a: "bg-[#0F1A33] text-[#93C5FD]",
  series_b: "bg-[#161533] text-[#C4B5FD]",
  series_c: "bg-[#1E1633] text-[#C4B5FD]",
  growth:   "bg-[#2E1626] text-[#F9A8D4]",
  unknown:  "bg-[#14101E] text-[#8A8398]",
};

const OUTREACH_CFG = {
  not_contacted: { label: "Not contacted", cls: "bg-[#14101E] text-[#9A93AC]" },
  reached_out:   { label: "Reached out",   cls: "bg-[#0F1A33] text-[#93C5FD]" },
  in_discussion: { label: "In discussion", cls: "bg-[#14352A] text-[#5EE6B5]" },
  passed:        { label: "Passed",        cls: "bg-[#2E1620] text-[#FB7185]" },
};

function SignalChip({ label, color }: { label: string; color: string }) {
  const cls: Record<string, string> = {
    blue:   "bg-[#0F1A33] text-[#93C5FD] border-[#2A2438]",
    green:  "bg-[#14352A] text-[#5EE6B5] border-[#2A2438]",
    purple: "bg-[#1E1633] text-[#C4B5FD] border-[#2A2438]",
    indigo: "bg-[#161533] text-[#C4B5FD] border-[#2A2438]",
    gray:   "bg-[#14101E] text-[#9A93AC] border-[#2A2438]",
    red:    "bg-[#2E1620] text-[#FB7185] border-[#2A2438]",
  };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls[color] ?? cls.gray}`}>{label}</span>
  );
}

export default function StartupRow({ filing, outreach, onOutreachChange, autoExpand }: Props) {
  const [expanded, setExpanded] = useState(autoExpand ?? false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(outreach?.notes || "");

  useEffect(() => { if (autoExpand) setExpanded(true); }, [autoExpand]);

  const { score } = filing;
  const scoreCls = SCORE_STYLE[score.bucket];
  const stageCls = STAGE_STYLE[filing.stage];
  const outreachStatus = outreach?.status || "not_contacted";

  const fundingLabel = (() => {
    if (filing.totalAmountSold && filing.totalAmountSold > 0) return fmt(filing.totalAmountSold);
    if (filing.totalOfferingAmount) return `${fmt(filing.totalOfferingAmount)} target`;
    return filing.offeringStatus === "open" ? "Raising" : "—";
  })();

  // Signal chips
  const chips: Array<{ label: string; color: string }> = [];
  chips.push({ label: filing.stageLabel, color: "indigo" });
  if (filing.offeringStatus === "open") chips.push({ label: "Raising", color: "green" });
  else if (filing.offeringStatus === "closed") chips.push({ label: "Funded", color: "purple" });
  if (filing.daysSinceFiling <= 14) chips.push({ label: `${filing.daysSinceFiling}d ago`, color: "red" });
  if (filing.totalAmountSold && filing.totalAmountSold >= 5_000_000) chips.push({ label: fmt(filing.totalAmountSold), color: "gray" });
  else if (filing.totalOfferingAmount && filing.totalOfferingAmount >= 5_000_000) chips.push({ label: `${fmt(filing.totalOfferingAmount)} target`, color: "gray" });

  const handleStatus = (s: OutreachRecord["status"]) => {
    onOutreachChange({ filingId: filing.id, entityName: filing.entityName, strategy: filing.stageLabel, status: s, notes, contactedAt: s !== "not_contacted" ? outreach?.contactedAt || new Date().toISOString() : undefined, score: score.overallScore });
  };

  const saveNotes = () => {
    onOutreachChange({ filingId: filing.id, entityName: filing.entityName, strategy: filing.stageLabel, status: outreachStatus, notes, contactedAt: outreach?.contactedAt, score: score.overallScore });
    setShowNotes(false);
  };

  return (
    <div className={`border-b border-[#2A2438] last:border-0 ${expanded ? "bg-[#161533]/10" : "hover:bg-[#14101E]/60"} transition-colors`}>
      {/* Row */}
      <div
        className="grid grid-cols-[56px_1fr_110px_150px_100px_72px] gap-3 px-4 py-3 cursor-pointer items-start"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Score */}
        <div className={`w-10 h-8 rounded-md flex items-center justify-center font-bold text-sm ring-1 mt-0.5 ${scoreCls}`}>
          {score.overallScore}
        </div>

        {/* Company + Why Now (prominent) + chips */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#F4F0FA] text-sm leading-tight">{filing.entityName}</span>
            {outreachStatus !== "not_contacted" && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${OUTREACH_CFG[outreachStatus].cls}`}>
                {OUTREACH_CFG[outreachStatus].label}
              </span>
            )}
          </div>
          {/* Why Now — front and center */}
          {score.whyNow[0] && (
            <p className="text-xs text-[#9A93AC] mt-1 leading-relaxed">
              <span className="text-indigo-500">→ </span>{score.whyNow[0]}
            </p>
          )}
          {/* Signal chips */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {chips.map((c) => <SignalChip key={c.label} label={c.label} color={c.color} />)}
          </div>
        </div>

        {/* Stage */}
        <div className="pt-0.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${stageCls}`}>
            {filing.stageLabel}
          </span>
        </div>

        {/* Funding */}
        <div className="text-sm text-[#B8B0C8] font-medium pt-0.5">{fundingLabel}</div>

        {/* Location */}
        <div className="text-xs text-[#8A8398] pt-0.5">{filing.state || "—"}</div>

        {/* Updated */}
        <div className="text-xs text-[#8A8398] pt-0.5">{ago(filing.daysSinceFiling)}</div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-5 pt-2 border-t border-[#2A2438]/60 bg-[#14101E] space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            <div>
              <p className="text-[11px] font-semibold text-[#8A8398] uppercase tracking-wide mb-2">Why Now</p>
              <ul className="space-y-1.5">
                {score.whyNow.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-indigo-400 mt-0.5 flex-shrink-0">→</span>
                    <span className="text-[#B8B0C8]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#8A8398] uppercase tracking-wide mb-2">Suggested Outreach</p>
              <p className="text-sm text-[#B8B0C8] italic bg-[#161533] rounded-lg px-3 py-2.5 border border-[#2A2438] leading-relaxed">
                &ldquo;{score.suggestedAngle}&rdquo;
              </p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-[#8A8398] uppercase tracking-wide mb-2">Signal Evidence</p>
            <div className="space-y-1.5">
              {score.signals.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                  <span className="text-[#B8B0C8] flex-1">{s.description}</span>
                  <span className="text-xs text-[#8A8398]">· {s.source}</span>
                  <span className="text-xs text-gray-300">+{s.weight}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <ScoreChip label="Funding" value={score.fundingScore} color="bg-[#161533]0" />
            <ScoreChip label="Hiring" value={score.hiringScore} color="bg-[#14352A]0" placeholder="Phase 2" />
            <ScoreChip label="Expansion" value={score.expansionScore} color="bg-[#1E1633]0" placeholder="Phase 2" />
          </div>

          {filing.relatedPersons && filing.relatedPersons.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#8A8398] uppercase tracking-wide mb-2">Key People</p>
              <div className="flex flex-wrap gap-2">
                {filing.relatedPersons.slice(0, 5).map((p, i) => (
                  <div key={i} className="bg-[#14101E] rounded-lg px-3 py-2 text-sm border border-[#2A2438]">
                    <div className="font-medium text-[#F4F0FA]">{[p.firstName, p.lastName].filter(Boolean).join(" ") || "—"}</div>
                    {p.title && <div className="text-xs text-[#9A93AC]">{p.title}</div>}
                    {p.city && <div className="text-xs text-[#8A8398]">{p.city}{p.state ? `, ${p.state}` : ""}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] font-semibold text-[#8A8398] uppercase tracking-wide mb-2">Track Outreach</p>
            <div className="flex flex-wrap gap-2">
              {(["not_contacted", "reached_out", "in_discussion", "passed"] as OutreachRecord["status"][]).map((s) => (
                <button key={s} onClick={(e) => { e.stopPropagation(); handleStatus(s); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${outreachStatus === s ? `${OUTREACH_CFG[s].cls} border-current` : "border-[#2A2438] text-[#9A93AC] hover:border-[#2A2438]"}`}>
                  {OUTREACH_CFG[s].label}
                </button>
              ))}
              <button onClick={(e) => { e.stopPropagation(); setShowNotes(!showNotes); }} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#2A2438] text-[#9A93AC] hover:border-[#2A2438]">
                {notes ? "Edit notes" : "Add notes"}
              </button>
              <a href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${filing.cik}&type=D&dateb=&owner=include&count=40`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#2A2438] text-[#9A93AC] hover:border-[#2A2438]">
                EDGAR ↗
              </a>
            </div>
            {showNotes && (
              <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes — contact info, round details, timing…" className="w-full text-sm border border-[#2A2438] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={3} />
                <div className="flex gap-2">
                  <button onClick={saveNotes} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800">Save</button>
                  <button onClick={() => setShowNotes(false)} className="px-3 py-1.5 bg-[#14101E] text-[#9A93AC] rounded-lg text-xs font-medium hover:bg-[#14101E]">Cancel</button>
                </div>
              </div>
            )}
            {notes && !showNotes && <p className="mt-2 text-xs text-[#9A93AC] italic bg-[#14101E] rounded-lg px-3 py-2 border border-[#2A2438]">{notes}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreChip({ label, value, color, placeholder }: { label: string; value: number; color: string; placeholder?: string }) {
  return (
    <div className="bg-[#14101E] rounded-lg px-3 py-2 border border-[#2A2438] min-w-[100px]">
      <div className="text-[10px] text-[#8A8398] mb-1">{label}</div>
      {placeholder ? (
        <div className="text-xs text-gray-300">{placeholder}</div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#F4F0FA]">{value}</span>
          <div className="flex-1 bg-[#14101E] rounded-full h-1">
            <div className={`h-1 rounded-full ${color}`} style={{ width: `${value}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
