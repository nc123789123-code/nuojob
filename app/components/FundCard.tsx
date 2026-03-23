"use client";

import { useState } from "react";
import { FundFiling, OutreachRecord, RaiseBucket } from "@/app/types";

interface FundCardProps {
  filing: FundFiling;
  outreach?: OutreachRecord;
  onOutreachChange: (record: OutreachRecord) => void;
}

function formatCurrency(amount?: number): string {
  if (!amount) return "—";
  if (amount >= 1_000_000_000)
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysAgoLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

const BUCKET_CONFIG: Record<
  RaiseBucket,
  { label: string; color: string; bar: string; ring: string }
> = {
  hot: {
    label: "🔥 Hot",
    color: "bg-red-100 text-red-700 border-red-200",
    bar: "bg-red-500",
    ring: "ring-red-200",
  },
  warm: {
    label: "Warm",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    bar: "bg-orange-400",
    ring: "ring-orange-200",
  },
  watch: {
    label: "Watch",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    bar: "bg-yellow-400",
    ring: "ring-yellow-200",
  },
  low: {
    label: "Low",
    color: "bg-gray-100 text-gray-500 border-gray-200",
    bar: "bg-gray-300",
    ring: "ring-gray-200",
  },
};

const CONFIDENCE_CONFIG = {
  high: { label: "High confidence", dot: "bg-green-500" },
  medium: { label: "Medium confidence", dot: "bg-yellow-400" },
  low: { label: "Low confidence", dot: "bg-gray-300" },
};

const OUTREACH_STATUS_CONFIG = {
  not_contacted: {
    label: "Not contacted",
    color: "bg-gray-100 text-gray-600",
  },
  reached_out: { label: "Reached out", color: "bg-blue-100 text-blue-700" },
  in_discussion: {
    label: "In discussion",
    color: "bg-green-100 text-green-700",
  },
  passed: { label: "Passed", color: "bg-red-100 text-red-600" },
};

export default function FundCard({
  filing,
  outreach,
  onOutreachChange,
}: FundCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(outreach?.notes || "");

  const { score } = filing;
  const bucket = BUCKET_CONFIG[score.bucket];
  const confidence = CONFIDENCE_CONFIG[score.confidence];
  const outreachStatus = outreach?.status || "not_contacted";
  const outreachCfg = OUTREACH_STATUS_CONFIG[outreachStatus];

  const percentRaised =
    filing.totalOfferingAmount && filing.totalAmountSold
      ? Math.min(
          100,
          (filing.totalAmountSold / filing.totalOfferingAmount) * 100
        )
      : null;

  const handleStatusChange = (newStatus: OutreachRecord["status"]) => {
    onOutreachChange({
      filingId: filing.id,
      entityName: filing.entityName,
      strategy: filing.strategyLabel,
      status: newStatus,
      notes,
      contactedAt:
        newStatus !== "not_contacted"
          ? outreach?.contactedAt || new Date().toISOString()
          : undefined,
      score: score.overallScore,
    });
  };

  const handleNotesSave = () => {
    onOutreachChange({
      filingId: filing.id,
      entityName: filing.entityName,
      strategy: filing.strategyLabel,
      status: outreachStatus,
      notes,
      contactedAt: outreach?.contactedAt,
      score: score.overallScore,
    });
    setShowNotes(false);
  };

  const edgarUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${filing.cik}&type=D&dateb=&owner=include&count=40`;

  return (
    <div
      className={`bg-white border rounded-xl transition-all duration-200 ${
        expanded
          ? "border-blue-200 shadow-md"
          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      {/* Main clickable row */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4">
          {/* Score circle */}
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-full flex flex-col items-center justify-center ring-2 ${bucket.ring} bg-white`}
          >
            <span className="text-base font-bold text-gray-900 leading-none">
              {score.overallScore}
            </span>
            <span className="text-[9px] text-gray-400 leading-none mt-0.5">
              /100
            </span>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                {filing.entityName}
              </h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium border ${bucket.color}`}
              >
                {bucket.label}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700">
                {filing.strategyLabel}
              </span>
              {filing.offeringStatus === "open" && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700">
                  In market
                </span>
              )}
              {filing.offeringStatus === "closed" && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-50 text-gray-500">
                  Closed
                </span>
              )}
            </div>

            {/* Why Now summary (first bullet, collapsed view) */}
            {score.whyNow[0] && (
              <p className="text-xs text-gray-500 mt-1 truncate">{score.whyNow[0]}</p>
            )}

            {/* Metrics */}
            <div className="flex items-center gap-4 mt-1.5 flex-wrap text-sm">
              {filing.totalOfferingAmount && (
                <span className="text-gray-600">
                  <span className="text-gray-400 text-xs">Target </span>
                  {formatCurrency(filing.totalOfferingAmount)}
                </span>
              )}
              {filing.totalAmountSold && filing.totalAmountSold > 0 && (
                <span className="text-gray-600">
                  <span className="text-gray-400 text-xs">Raised </span>
                  {formatCurrency(filing.totalAmountSold)}
                </span>
              )}
              {filing.state && (
                <span className="text-gray-500 text-xs">{filing.state}</span>
              )}
              <span className="text-gray-400 text-xs">
                {daysAgoLabel(filing.daysSinceFiling)} ·{" "}
                {formatDate(filing.fileDate)}
              </span>
            </div>

            {/* Progress bar */}
            {percentRaised !== null && (
              <div className="mt-2.5">
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${bucket.bar}`}
                    style={{ width: `${percentRaised}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 mt-0.5">
                  {percentRaised.toFixed(0)}% toward target
                </span>
              </div>
            )}
          </div>

          {/* Right side: outreach status + confidence */}
          <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${outreachCfg.color}`}
            >
              {outreachCfg.label}
            </span>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full ${confidence.dot}`}
              />
              <span className="text-xs text-gray-400">
                {confidence.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {/* Why now box */}
          <div className="p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Why Now
            </h4>
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
          <div className="p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Suggested Outreach Angle
            </h4>
            <p className="text-sm text-gray-700 italic bg-blue-50 rounded-lg px-3 py-2.5 border border-blue-100">
              &ldquo;{score.suggestedAngle}&rdquo;
            </p>
            <div className="mt-3">
              <span className="text-xs text-gray-400 mr-2">Target teams:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {score.suggestedTargetTeams.map((team) => (
                  <span
                    key={team}
                    className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full"
                  >
                    {team}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Signal timeline */}
          <div className="p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Signal Evidence
            </h4>
            <div className="space-y-2">
              {score.signals.map((signal, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm text-gray-700">
                      {signal.description}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      · {signal.source}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    +{signal.weight}
                  </span>
                </div>
              ))}
            </div>

            {/* Score breakdown */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <ScoreBar
                label="Fundraising"
                value={score.fundraisingScore}
                color="bg-blue-500"
              />
              <ScoreBar
                label="Hiring"
                value={score.hiringScore}
                color="bg-green-500"
                placeholder="Phase 2"
              />
              <ScoreBar
                label="Expansion"
                value={score.expansionScore}
                color="bg-purple-500"
                placeholder="Phase 2"
              />
            </div>
          </div>

          {/* Key people */}
          {filing.relatedPersons && filing.relatedPersons.length > 0 && (
            <div className="p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Key People (from Form D)
              </h4>
              <div className="flex flex-wrap gap-2">
                {filing.relatedPersons.slice(0, 5).map((person, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 rounded-lg px-3 py-2 text-sm"
                  >
                    <div className="font-medium text-gray-800">
                      {[person.firstName, person.lastName]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </div>
                    {person.title && (
                      <div className="text-xs text-gray-500">
                        {person.title}
                      </div>
                    )}
                    {person.city && (
                      <div className="text-xs text-gray-400">
                        {person.city}
                        {person.state ? `, ${person.state}` : ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outreach actions */}
          <div className="p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Track Outreach
            </h4>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "not_contacted",
                  "reached_out",
                  "in_discussion",
                  "passed",
                ] as OutreachRecord["status"][]
              ).map((s) => {
                const cfg = OUTREACH_STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(s);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      outreachStatus === s
                        ? `${cfg.color} border-current`
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotes(!showNotes);
                }}
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
                  placeholder="Notes on this fund — contact info, convo details, timing..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleNotesSave}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowNotes(false)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {notes && !showNotes && (
              <p className="mt-2 text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2">
                {notes}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBar({
  label,
  value,
  color,
  placeholder,
}: {
  label: string;
  value: number;
  color: string;
  placeholder?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {placeholder ? (
        <div className="text-xs text-gray-300">{placeholder}</div>
      ) : (
        <>
          <div className="text-sm font-bold text-gray-800">{value}</div>
          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
            <div
              className={`h-1 rounded-full ${color}`}
              style={{ width: `${value}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
