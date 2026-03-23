"use client";

import { useState } from "react";
import { StartupFiling, OutreachRecord, RaiseBucket, FundingStage } from "@/app/types";

interface StartupCardProps {
  filing: StartupFiling;
  outreach?: OutreachRecord;
  onOutreachChange: (record: OutreachRecord) => void;
}

function formatCurrency(amount?: number): string {
  if (!amount) return "—";
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function daysAgoLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

const BUCKET_CONFIG: Record<RaiseBucket, { label: string; color: string; bar: string; ring: string }> = {
  hot:   { label: "🔥 Hot",  color: "bg-red-100 text-red-700 border-red-200",       bar: "bg-red-500",    ring: "ring-red-200"    },
  warm:  { label: "Warm",    color: "bg-orange-100 text-orange-700 border-orange-200", bar: "bg-orange-400", ring: "ring-orange-200" },
  watch: { label: "Watch",   color: "bg-yellow-100 text-yellow-700 border-yellow-200", bar: "bg-yellow-400", ring: "ring-yellow-200" },
  low:   { label: "Low",     color: "bg-gray-100 text-gray-500 border-gray-200",     bar: "bg-gray-300",   ring: "ring-gray-200"   },
};

const STAGE_COLORS: Record<FundingStage, string> = {
  pre_seed: "bg-gray-100 text-gray-600",
  seed:     "bg-green-100 text-green-700",
  series_a: "bg-blue-100 text-blue-700",
  series_b: "bg-indigo-100 text-indigo-700",
  series_c: "bg-purple-100 text-purple-700",
  growth:   "bg-pink-100 text-pink-700",
  unknown:  "bg-gray-100 text-gray-500",
};

const OUTREACH_STATUS_CONFIG = {
  not_contacted: { label: "Not contacted", color: "bg-gray-100 text-gray-600" },
  reached_out:   { label: "Reached out",   color: "bg-blue-100 text-blue-700" },
  in_discussion: { label: "In discussion", color: "bg-green-100 text-green-700" },
  passed:        { label: "Passed",        color: "bg-red-100 text-red-600" },
};

export default function StartupCard({ filing, outreach, onOutreachChange }: StartupCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(outreach?.notes || "");

  const { score } = filing;
  const bucket = BUCKET_CONFIG[score.bucket];
  const stageColor = STAGE_COLORS[filing.stage];
  const outreachStatus = outreach?.status || "not_contacted";
  const outreachCfg = OUTREACH_STATUS_CONFIG[outreachStatus];

  const handleStatusChange = (newStatus: OutreachRecord["status"]) => {
    onOutreachChange({
      filingId: filing.id,
      entityName: filing.entityName,
      strategy: filing.stageLabel,
      status: newStatus,
      notes,
      contactedAt: newStatus !== "not_contacted" ? outreach?.contactedAt || new Date().toISOString() : undefined,
      score: score.overallScore,
    });
  };

  const handleNotesSave = () => {
    onOutreachChange({
      filingId: filing.id,
      entityName: filing.entityName,
      strategy: filing.stageLabel,
      status: outreachStatus,
      notes,
      contactedAt: outreach?.contactedAt,
      score: score.overallScore,
    });
    setShowNotes(false);
  };

  const edgarUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${filing.cik}&type=D&dateb=&owner=include&count=40`;
  const fundingLabel = filing.totalAmountSold && filing.totalAmountSold > 0
    ? formatCurrency(filing.totalAmountSold)
    : filing.totalOfferingAmount ? `${formatCurrency(filing.totalOfferingAmount)} target` : "—";

  return (
    <div
      className={`bg-white border rounded-xl transition-all duration-200 ${
        expanded ? "border-indigo-200 shadow-md" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      {/* Compact main row */}
      <div className="px-4 py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          {/* Score pill */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ring-2 ${bucket.ring} bg-white`}>
            <span className="text-sm font-bold text-gray-900">{score.overallScore}</span>
          </div>

          {/* Company + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm truncate">{filing.entityName}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageColor}`}>
                {filing.stageLabel}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${bucket.color}`}>
                {bucket.label}
              </span>
              {filing.offeringStatus === "open" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                  Active raise
                </span>
              )}
            </div>
            {/* Why Now summary (first bullet) */}
            {score.whyNow[0] && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{score.whyNow[0]}</p>
            )}
          </div>

          {/* Right side: funding + location + time */}
          <div className="flex-shrink-0 text-right hidden sm:block">
            <div className="text-sm font-medium text-gray-700">{fundingLabel}</div>
            <div className="text-xs text-gray-400">
              {filing.state && `${filing.state} · `}{daysAgoLabel(filing.daysSinceFiling)}
            </div>
          </div>

          {/* Outreach badge */}
          {outreachStatus !== "not_contacted" && (
            <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${outreachCfg.color}`}>
              {outreachCfg.label}
            </span>
          )}

          <span className="text-gray-300 flex-shrink-0">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {/* Why Now */}
          <div className="p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Why Now</h4>
            <ul className="space-y-1">
              {score.whyNow.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-indigo-400 mt-0.5 flex-shrink-0">→</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Suggested angle */}
          <div className="p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Suggested Outreach</h4>
            <p className="text-sm text-gray-700 italic bg-indigo-50 rounded-lg px-3 py-2.5 border border-indigo-100">
              &ldquo;{score.suggestedAngle}&rdquo;
            </p>
          </div>

          {/* Signal evidence */}
          <div className="p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Signal Evidence</h4>
            <div className="space-y-2">
              {score.signals.map((sig, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 flex-1">{sig.description}</span>
                  <span className="text-xs text-gray-400">· {sig.source}</span>
                  <span className="text-xs text-gray-400">+{sig.weight}</span>
                </div>
              ))}
            </div>
            {/* Score breakdown */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <ScoreBar label="Funding" value={score.fundingScore} color="bg-indigo-500" />
              <ScoreBar label="Hiring" value={score.hiringScore} color="bg-green-500" placeholder="Phase 2" />
              <ScoreBar label="Expansion" value={score.expansionScore} color="bg-purple-500" placeholder="Phase 2" />
            </div>
          </div>

          {/* Key people */}
          {filing.relatedPersons && filing.relatedPersons.length > 0 && (
            <div className="p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key People</h4>
              <div className="flex flex-wrap gap-2">
                {filing.relatedPersons.slice(0, 5).map((p, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <div className="font-medium text-gray-800">
                      {[p.firstName, p.lastName].filter(Boolean).join(" ") || "—"}
                    </div>
                    {p.title && <div className="text-xs text-gray-500">{p.title}</div>}
                    {p.city && <div className="text-xs text-gray-400">{p.city}{p.state ? `, ${p.state}` : ""}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outreach */}
          <div className="p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Track Outreach</h4>
            <div className="flex flex-wrap gap-2">
              {(["not_contacted", "reached_out", "in_discussion", "passed"] as OutreachRecord["status"][]).map((s) => {
                const cfg = OUTREACH_STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={(e) => { e.stopPropagation(); handleStatusChange(s); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      outreachStatus === s ? `${cfg.color} border-current` : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
              <button
                onClick={(e) => { e.stopPropagation(); setShowNotes(!showNotes); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:border-gray-300"
              >
                {notes ? "Edit notes" : "Add notes"}
              </button>
              <a
                href={edgarUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:border-gray-300"
              >
                EDGAR ↗
              </a>
            </div>

            {showNotes && (
              <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes on this company — contact info, stage details, timing..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button onClick={handleNotesSave} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">Save</button>
                  <button onClick={() => setShowNotes(false)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200">Cancel</button>
                </div>
              </div>
            )}
            {notes && !showNotes && (
              <p className="mt-2 text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2">{notes}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, value, color, placeholder }: { label: string; value: number; color: string; placeholder?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {placeholder ? (
        <div className="text-xs text-gray-300">{placeholder}</div>
      ) : (
        <>
          <div className="text-sm font-bold text-gray-800">{value}</div>
          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
            <div className={`h-1 rounded-full ${color}`} style={{ width: `${value}%` }} />
          </div>
        </>
      )}
    </div>
  );
}
