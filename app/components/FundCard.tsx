"use client";

import { useState } from "react";
import { FundFiling, OutreachRecord, RaiseBucket } from "@/app/types";

interface Props {
  filing: FundFiling;
  outreach?: OutreachRecord;
  onOutreachChange: (record: OutreachRecord) => void;
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

export default function FundRow({ filing, outreach, onOutreachChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(outreach?.notes || "");

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
    return filing.offeringStatus === "open" ? "Open" : filing.offeringStatus === "closed" ? "Closed" : "—";
  })();

  const handleStatus = (s: OutreachRecord["status"]) => {
    onOutreachChange({
      filingId: filing.id, entityName: filing.entityName, strategy: filing.strategyLabel,
      status: s, notes,
      contactedAt: s !== "not_contacted" ? outreach?.contactedAt || new Date().toISOString() : undefined,
      score: score.overallScore,
    });
  };

  const saveNotes = () => {
    onOutreachChange({ filingId: filing.id, entityName: filing.entityName, strategy: filing.strategyLabel, status: outreachStatus, notes, contactedAt: outreach?.contactedAt, score: score.overallScore });
    setShowNotes(false);
  };

  return (
    <div className={`border-b border-gray-100 last:border-0 ${expanded ? "bg-blue-50/20" : "hover:bg-gray-50/60"} transition-colors`}>
      {/* Row */}
      <div
        className="grid grid-cols-[56px_1fr_140px_160px_100px_72px] gap-3 px-4 py-3 cursor-pointer items-center"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Score */}
        <div className={`w-10 h-8 rounded-md flex items-center justify-center font-bold text-sm ring-1 ${scoreCls}`}>
          {score.overallScore}
        </div>

        {/* Fund name + subtitle */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 text-sm leading-tight">{filing.entityName}</span>
            {outreachStatus !== "not_contacted" && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${OUTREACH_CFG[outreachStatus].cls}`}>
                {OUTREACH_CFG[outreachStatus].label}
              </span>
            )}
          </div>
          {score.whyNow[0] && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{score.whyNow[0]}</p>
          )}
        </div>

        {/* Strategy */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium whitespace-nowrap">
            {filing.strategyLabel}
          </span>
          {filing.offeringStatus === "open" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium whitespace-nowrap">In market</span>
          )}
        </div>

        {/* Fundraising signal */}
        <div className="text-sm text-gray-700 truncate">{fundraisingLabel}</div>

        {/* Location */}
        <div className="text-xs text-gray-400">{filing.state || "—"}</div>

        {/* Updated */}
        <div className="text-xs text-gray-400">{ago(filing.daysSinceFiling)}</div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-5 pt-2 border-t border-blue-100/60 bg-white space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            {/* Why Now */}
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

            {/* Outreach angle */}
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

          {/* Signals */}
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
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Key People (Form D)</p>
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

          {/* Track outreach */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Track Outreach</p>
            <div className="flex flex-wrap gap-2">
              {(["not_contacted", "reached_out", "in_discussion", "passed"] as OutreachRecord["status"][]).map((s) => (
                <button
                  key={s}
                  onClick={(e) => { e.stopPropagation(); handleStatus(s); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    outreachStatus === s ? `${OUTREACH_CFG[s].cls} border-current` : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {OUTREACH_CFG[s].label}
                </button>
              ))}
              <button onClick={(e) => { e.stopPropagation(); setShowNotes(!showNotes); }} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:border-gray-300">
                {notes ? "Edit notes" : "Add notes"}
              </button>
              <a
                href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${filing.cik}&type=D&dateb=&owner=include&count=40`}
                target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:border-gray-300"
              >
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
            <div className={`h-1 rounded-full ${color}`} style={{ width: `${value}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
