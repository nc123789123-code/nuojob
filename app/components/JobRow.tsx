"use client";

import { JobSignal, JobCategory, JobSignalTag } from "@/app/types";

interface Props {
  signal: JobSignal;
}

const CATEGORY_STYLE: Record<JobCategory, string> = {
  "Credit":          "bg-blue-50 text-blue-700 border-blue-100",
  "Equity":          "bg-indigo-50 text-indigo-700 border-indigo-100",
  "Equity Research": "bg-violet-50 text-violet-700 border-violet-100",
  "Quant":           "bg-pink-50 text-pink-700 border-pink-100",
  "IR / Ops":        "bg-emerald-50 text-emerald-700 border-emerald-100",
  "Other":           "bg-gray-50 text-gray-600 border-gray-100",
};

const SIGNAL_STYLE: Record<JobSignalTag, string> = {
  "In-market raise":     "bg-amber-50 text-amber-700 border-amber-100",
  "Post-raise build-out":"bg-green-50 text-green-700 border-green-100",
  "Fund scaling":        "bg-blue-50 text-blue-700 border-blue-100",
  "New fund":            "bg-gray-50 text-gray-500 border-gray-100",
};

function agoLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export default function JobRow({ signal }: Props) {
  return (
    <div className="grid grid-cols-[1fr_150px_120px_80px_130px_80px] gap-3 px-4 py-3 border-b border-gray-100 last:border-0 items-center hover:bg-gray-50/60 transition-colors group">
      {/* Firm + role + why */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">{signal.firm}</span>
        </div>
        <div className="text-sm text-gray-600 mt-0.5">{signal.role}</div>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          <span className="text-blue-400">→ </span>{signal.why}
        </p>
      </div>

      {/* Category */}
      <div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${CATEGORY_STYLE[signal.category]}`}>
          {signal.category}
        </span>
      </div>

      {/* Location */}
      <div className="text-xs text-gray-500">{signal.location}</div>

      {/* Days ago */}
      <div className="text-xs text-gray-400 tabular-nums">{agoLabel(signal.daysAgo)}</div>

      {/* Signal tag */}
      <div>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${SIGNAL_STYLE[signal.signalTag]}`}>
          {signal.signalTag}
        </span>
      </div>

      {/* EDGAR link */}
      <div>
        {signal.edgarUrl && (
          <a
            href={signal.edgarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-gray-300 group-hover:text-blue-400 transition-colors font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            EDGAR ↗
          </a>
        )}
      </div>
    </div>
  );
}
