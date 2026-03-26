"use client";

import { JobSignal, JobCategory, JobSignalTag } from "@/app/types";

interface Props {
  signal: JobSignal;
}

const CATEGORY_STYLE: Record<JobCategory, string> = {
  "Private Credit":     "bg-blue-50 text-blue-700 border-blue-100",
  "Public Credit":      "bg-sky-50 text-sky-700 border-sky-100",
  "Equity Research":    "bg-violet-50 text-violet-700 border-violet-100",
  "Equity Investing":   "bg-indigo-50 text-indigo-700 border-indigo-100",
  "Investment Banking": "bg-amber-50 text-amber-700 border-amber-100",
  "Quant":              "bg-pink-50 text-pink-700 border-pink-100",
  "IR / Ops":           "bg-emerald-50 text-emerald-700 border-emerald-100",
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

function sourceInfo(id: string): { label: string; style: string } {
  if (id.startsWith("gh-"))       return { label: "Greenhouse",     style: "bg-green-50 text-green-700 border-green-200"   };
  if (id.startsWith("lever-"))    return { label: "Lever",          style: "bg-teal-50 text-teal-700 border-teal-200"       };
  if (id.startsWith("edgar-"))    return { label: "EDGAR",          style: "bg-gray-50 text-gray-500 border-gray-200"       };
  if (id.startsWith("adzuna-"))   return { label: "Adzuna",         style: "bg-blue-50 text-blue-700 border-blue-200"       };
  if (id.startsWith("muse-"))     return { label: "The Muse",       style: "bg-purple-50 text-purple-700 border-purple-200" };
  if (id.startsWith("jobs14-"))   return { label: "LinkedIn/Indeed",style: "bg-sky-50 text-sky-700 border-sky-200"          };
  if (id.startsWith("fj-"))       return { label: "LinkedIn",       style: "bg-sky-600 text-white border-sky-700"           };
  if (id.startsWith("li-"))       return { label: "LinkedIn",       style: "bg-sky-600 text-white border-sky-700"           };
  return { label: "Board", style: "bg-gray-50 text-gray-500 border-gray-200" };
}

function ScoreBadge({ score }: { score: number }) {
  const bg   = score >= 80 ? "bg-red-500" : score >= 65 ? "bg-amber-500" : score >= 50 ? "bg-yellow-400" : "bg-gray-200";
  const text = score >= 50 ? "text-white" : "text-gray-600";
  return (
    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
      <span className={`font-bold text-[11px] tabular-nums ${text}`}>{score}</span>
    </div>
  );
}

export default function JobRow({ signal }: Props) {
  const src = sourceInfo(signal.id);
  return (
    <div className="grid grid-cols-[40px_1fr_130px_100px_72px_130px_72px] gap-3 px-4 py-3 border-b border-gray-100 last:border-0 items-center hover:bg-gray-50/60 transition-colors group">
      {/* Score */}
      <ScoreBadge score={signal.score} />

      {/* Firm + role + source + why */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm">{signal.firm}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${src.style}`}>{src.label}</span>
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

      {/* Apply / EDGAR link */}
      <div>
        {signal.edgarUrl && (
          <a
            href={signal.edgarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-gray-300 group-hover:text-blue-400 transition-colors font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {signal.id.startsWith("edgar-") ? "EDGAR ↗" : "Apply ↗"}
          </a>
        )}
      </div>
    </div>
  );
}
