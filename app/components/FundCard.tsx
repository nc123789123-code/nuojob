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
    blue:   "bg-sky-50 text-[#396477] border-sky-100",
    green:  "bg-[#c3ecd7]/50 text-[#416656] border-[#a8cfbc]/50",
    purple: "bg-[#e1ddf2]/60 text-[#5e5c6e] border-[#c7c4d8]/50",
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
    <div className={`border-b border-gray-100 last:border-0 ${expanded ? "bg-sky-50/20" : "hover:bg-gray-50/60"} transition-colors`}>
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
              <span className="text-[#396477]">→ </span>{score.whyNow[0]}
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
        <div className="pt-0.5">
          <div className="text-sm text-gray-700 truncate">{fundraisingLabel}</div>
          {filing.totalAmountSold && filing.totalOfferingAmount && filing.totalAmountSold > 0 && (
            <div className="mt-1 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-1 rounded-full ${Math.round((filing.totalAmountSold / filing.totalOfferingAmount) * 100) >= 90 ? "bg-red-400" : "bg-[#396477]"}`}
                style={{ width: `${Math.min(100, Math.round((filing.totalAmountSold / filing.totalOfferingAmount) * 100))}%` }}
              />
            </div>
          )}
        </div>

        {/* Location + first contact */}
        <div className="pt-0.5 space-y-0.5">
          <div className="text-xs text-gray-400">{filing.businessCity || filing.state || "—"}</div>
          {filing.relatedPersons?.[0] && (
            <div className="text-[10px] text-gray-500 truncate">
              {[filing.relatedPersons[0].firstName, filing.relatedPersons[0].lastName].filter(Boolean).join(" ")}
              {filing.relatedPersons[0].title ? ` · ${filing.relatedPersons[0].title.split(",")[0]}` : ""}
            </div>
          )}
        </div>

        {/* Updated */}
        <div className="text-xs text-gray-400 pt-0.5">{ago(filing.daysSinceFiling)}</div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-5 pt-2 border-t border-sky-100/40 bg-white space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            {/* Why Now — full list */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Why Now</p>
              <ul className="space-y-1.5">
                {score.whyNow.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-[#396477] mt-0.5 flex-shrink-0">→</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suggested outreach */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Suggested Outreach</p>
              <p className="text-sm text-gray-700 italic bg-sky-50 rounded-lg px-3 py-2.5 border border-sky-100 leading-relaxed">
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
                  <div className="w-1.5 h-1.5 rounded-full bg-[#396477]/60 flex-shrink-0" />
                  <span className="text-gray-700 flex-1">{s.description}</span>
                  <span className="text-xs text-gray-400">· {s.source}</span>
                  <span className="text-xs text-gray-300">+{s.weight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Score breakdown */}
          <div className="flex gap-3 flex-wrap">
            <ScoreChip label="Fundraising" value={score.fundraisingScore} color="bg-[#396477]" />
            <ScoreChip label="Hiring" value={score.hiringScore} color="bg-green-500" placeholder="Phase 2" />
            <ScoreChip label="Expansion" value={score.expansionScore} color="bg-purple-500" placeholder="Phase 2" />
          </div>

          {/* Key people */}
          {filing.relatedPersons && filing.relatedPersons.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Key People</p>
              <div className="flex flex-wrap gap-2">
                {filing.relatedPersons.slice(0, 5).map((p, i) => {
                  const fullName = [p.firstName, p.lastName].filter(Boolean).join(" ");
                  const liSearch = fullName ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(fullName + " " + filing.entityName)}` : undefined;
                  const gSearch = fullName ? `https://www.google.com/search?q=${encodeURIComponent(fullName + " " + filing.entityName)}` : undefined;
                  return (
                    <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-100">
                      <div className="font-medium text-gray-800">{fullName || "—"}</div>
                      {p.title && <div className="text-xs text-gray-500">{p.title}</div>}
                      {p.city && <div className="text-xs text-gray-400">{p.city}{p.state ? `, ${p.state}` : ""}</div>}
                      {fullName && (
                        <div className="flex gap-2 mt-1.5">
                          {liSearch && <a href={liSearch} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] text-sky-600 hover:underline">LinkedIn ↗</a>}
                          {gSearch && <a href={gSearch} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] text-gray-400 hover:underline">Google ↗</a>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contact info */}
          {(filing.phone || filing.website) && (
            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
              {filing.phone && <span>📞 {filing.phone}</span>}
              {filing.website && (
                <a href={filing.website.startsWith("http") ? filing.website : `https://${filing.website}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#396477] hover:underline">
                  🌐 {filing.website.replace(/^https?:\/\//,"").replace(/\/$/,"")}
                </a>
              )}
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
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes — contact info, convo details, timing…" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#396477]" rows={3} />
                <div className="flex gap-2">
                  <button onClick={saveNotes} className="px-3 py-1.5 bg-[#396477] text-white rounded-lg text-xs font-medium hover:bg-[#2d5162]">Save</button>
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
