"use client";

import { useState, useEffect } from "react";
import { FundFiling, OutreachRecord, RaiseBucket } from "@/app/types";

interface Props {
  filing: FundFiling;
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
  hot:   "bg-red-100 text-red-700 ring-red-200",
  warm:  "bg-amber-100 text-amber-700 ring-amber-200",
  watch: "bg-yellow-100 text-yellow-700 ring-yellow-200",
  low:   "bg-gray-100 text-gray-500 ring-gray-200",
};

const OUTREACH_CFG = {
  not_contacted: { label: "Not contacted", cls: "bg-gray-100 text-gray-600" },
  reached_out:   { label: "Reached out",   cls: "bg-blue-100 text-blue-700" },
  in_discussion: { label: "In discussion", cls: "bg-green-100 text-green-700" },
  passed:        { label: "Passed",        cls: "bg-red-100 text-red-600" },
};

function SignalChip({ label, color }: { label: string; color: string }) {
  const cls: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-700 border-blue-100",
    green:  "bg-emerald-50 text-emerald-700 border-emerald-100",
    purple: "bg-violet-50 text-violet-700 border-violet-100",
    gray:   "bg-gray-50 text-gray-600 border-gray-100",
    red:    "bg-red-50 text-red-700 border-red-100",
  };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls[color] ?? cls.gray}`}>{label}</span>
  );
}

export default function FundRow({ filing, outreach, onOutreachChange, autoExpand }: Props) {
  const [expanded, setExpanded] = useState(autoExpand ?? false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(outreach?.notes || "");

  useEffect(() => { if (autoExpand) setExpanded(true); }, [autoExpand]);

  const { score } = filing;
  const scoreCls = SCORE_STYLE[score.bucket];
  const outreachStatus = outreach?.status || "not_contacted";

  const fundraisingLabel = (() => {
    if (filing.totalAmountSold && filing.totalAmountSold > 0 && filing.totalOfferingAmount) {
      const pct = Math.round((filing.totalAmountSold / filing.totalOfferingAmount) * 100);
      return `${fmt(filing.totalAmountSold)} / ${fmt(filing.totalOfferingAmount)} (${pct}%)`;
    }
    if (filing.totalAmountSold && filing.totalAmountSold > 0) return `Raised ${fmt(filing.totalAmountSold)}`;
    if (filing.totalOfferingAmount) return `${fmt(filing.totalOfferingAmount)} target`;
    return filing.offeringStatus === "open" ? "Raising" : filing.offeringStatus === "closed" ? "Closed" : "—";
  })();

  // Signal chips
  const chips: Array<{ label: string; color: string }> = [];
  chips.push({ label: filing.formType === "D" ? "New Form D" : "Form D/A", color: "blue" });
  if (filing.offeringStatus === "open") chips.push({ label: "In market", color: "green" });
  else if (filing.offeringStatus === "closed") chips.push({ label: "Recently closed", color: "purple" });
  if (filing.daysSinceFiling <= 14) chips.push({ label: `${filing.daysSinceFiling}d ago`, color: "red" });
  if (filing.totalOfferingAmount && filing.totalOfferingAmount >= 100_000_000) chips.push({ label: fmt(filing.totalOfferingAmount), color: "gray" });

  const handleStatus = (s: OutreachRecord["status"]) => {
    onOutreachChange({ filingId: filing.id, entityName: filing.entityName, strategy: filing.strategyLabel, status: s, notes, contactedAt: s !== "not_contacted" ? outreach?.contactedAt || new Date().toISOString() : undefined, score: score.overallScore });
  };

  const saveNotes = () => {
    onOutreachChange({ filingId: filing.id, entityName: filing.entityName, strategy: filing.strategyLabel, status: outreachStatus, notes, contactedAt: outreach?.contactedAt, score: score.overallScore });
    setShowNotes(false);
  };

  return (
    <div className={`border-b border-gray-100 last:border-0 ${expanded ? "bg-blue-50/10" : "hover:bg-gray-50/60"} transition-colors`}>
      {/* Collapsed row */}
      <div
        className="grid grid-cols-[56px_1fr_140px_160px_100px_72px] gap-3 px-4 py-3 cursor-pointer items-start"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Score */}
        <div className={`w-10 h-8 rounded-md flex items-center justify-center font-bold text-sm ring-1 mt-0.5 ${scoreCls}`}>
          {score.overallScore}
        </div>

        {/* Fund name + Why Now (prominent) + chips */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm leading-tight">{filing.entityName}</span>
            {outreachStatus !== "not_contacted" && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${OUTREACH_CFG[outreachStatus].cls}`}>
                {OUTREACH_CFG[outreachStatus].label}
              </span>
            )}
          </div>
          {/* Why Now — front and center */}
          {score.whyNow[0] && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              <span className="text-blue-500">→ </span>{score.whyNow[0]}
            </p>
          )}
          {/* Signal chips */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {chips.map((c) => <SignalChip key={c.label} label={c.label} color={c.color} />)}
          </div>
        </div>

        {/* Strategy */}
        <div className="pt-0.5">
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium whitespace-nowrap">
            {filing.strategyLabel}
          </span>
        </div>

        {/* Fundraising signal */}
        <div className="text-sm text-gray-700 pt-0.5 truncate">{fundraisingLabel}</div>

        {/* Location */}
        <div className="text-xs text-gray-400 pt-0.5">{filing.state || "—"}</div>

        {/* Updated */}
        <div className="text-xs text-gray-400 pt-0.5">{ago(filing.daysSinceFiling)}</div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-5 pt-2 border-t border-blue-100/60 bg-white space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            {/* Why Now — full list */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Why Now</p>
              <ul className="space-y-1.5">
                {score.whyNow.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-400 mt-0.5 flex-shrink-0">→</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suggested outreach */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Suggested Outreach</p>
              <p className="text-sm text-gray-700 italic bg-blue-50 rounded-lg px-3 py-2.5 border border-blue-100 leading-relaxed">
                &ldquo;{score.suggestedAngle}&rdquo;
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {score.suggestedTargetTeams.map((t) => (
                  <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Signal evidence */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Signal Evidence</p>
            <div className="space-y-1.5">
              {score.signals.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="text-gray-700 flex-1">{s.description}</span>
                  <span className="text-xs text-gray-400">· {s.source}</span>
                  <span className="text-xs text-gray-300">+{s.weight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Score breakdown */}
          <div className="flex gap-3 flex-wrap">
            <ScoreChip label="Fundraising" value={score.fundraisingScore} color="bg-blue-500" />
            <ScoreChip label="Hiring" value={score.hiringScore} color="bg-green-500" placeholder="Phase 2" />
            <ScoreChip label="Expansion" value={score.expansionScore} color="bg-purple-500" placeholder="Phase 2" />
          </div>

          {/* Key people */}
          {filing.relatedPersons && filing.relatedPersons.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Key People</p>
              <div className="flex flex-wrap gap-2">
                {filing.relatedPersons.slice(0, 5).map((p, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-100">
                    <div className="font-medium text-gray-800">{[p.firstName, p.lastName].filter(Boolean).join(" ") || "—"}</div>
                    {p.title && <div className="text-xs text-gray-500">{p.title}</div>}
                    {p.city && <div className="text-xs text-gray-400">{p.city}{p.state ? `, ${p.state}` : ""}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outreach tracking */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Track Outreach</p>
            <div className="flex flex-wrap gap-2">
              {(["not_contacted", "reached_out", "in_discussion", "passed"] as OutreachRecord["status"][]).map((s) => (
                <button key={s} onClick={(e) => { e.stopPropagation(); handleStatus(s); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${outreachStatus === s ? `${OUTREACH_CFG[s].cls} border-current` : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  {OUTREACH_CFG[s].label}
                </button>
              ))}
              <button onClick={(e) => { e.stopPropagation(); setShowNotes(!showNotes); }} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:border-gray-300">
                {notes ? "Edit notes" : "Add notes"}
              </button>
              <a href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${filing.cik}&type=D&dateb=&owner=include&count=40`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:border-gray-300">
                EDGAR ↗
              </a>
            </div>
            {showNotes && (
              <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes — contact info, convo details, timing…" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
                <div className="flex gap-2">
                  <button onClick={saveNotes} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800">Save</button>
                  <button onClick={() => setShowNotes(false)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200">Cancel</button>
                </div>
              </div>
            )}
            {notes && !showNotes && <p className="mt-2 text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">{notes}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreChip({ label, value, color, placeholder }: { label: string; value: number; color: string; placeholder?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 min-w-[100px]">
      <div className="text-[10px] text-gray-400 mb-1">{label}</div>
      {placeholder ? (
        <div className="text-xs text-gray-300">{placeholder}</div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-800">{value}</span>
          <div className="flex-1 bg-gray-200 rounded-full h-1">
            <div className={`h-1 rounded-full ${color}`} style={{ width: `${value * 10}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
