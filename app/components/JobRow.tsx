"use client";

import { JobSignal, JobCategory, JobSignalTag } from "@/app/types";

interface Props {
  signal: JobSignal;
}

const CATEGORY_STYLE: Record<JobCategory, string> = {
  "Private Credit":     "bg-[#0F2033] text-[#A78BFA] border-[#38324E]",
  "Public Credit":      "bg-[#0F2033] text-[#7DD3FC] border-[#38324E]",
  "Equity Research":    "bg-[#1E1633] text-[#C4B5FD] border-[#38324E]",
  "Other Finance Roles":   "bg-[#161533] text-[#C4B5FD] border-[#38324E]",
  "Investment Banking": "bg-[#2A2113] text-[#F5B544] border-[#38324E]",
  "Quant":              "bg-[#2E1626] text-[#F9A8D4] border-[#38324E]",
  "IR / Ops":           "bg-[#14352A] text-[#5EE6B5] border-[#38324E]",
};

const SIGNAL_STYLE: Record<JobSignalTag, string> = {
  "In-market raise":     "bg-[#2A2113] text-[#F5B544] border-[#38324E]",
  "Post-raise build-out":"bg-[#14352A] text-[#5EE6B5] border-[#38324E]",
  "Fund scaling":        "bg-[#0F2033] text-[#A78BFA] border-[#38324E]",
  "New fund":            "bg-[#201B2E] text-[#9A93AC] border-[#38324E]",
};

function agoLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

function sourceInfo(id: string): { label: string; style: string } {
  if (id.startsWith("gh-"))       return { label: "Greenhouse",     style: "bg-[#14352A] text-[#5EE6B5] border-[#38324E]"   };
  if (id.startsWith("lever-"))    return { label: "Lever",          style: "bg-[#0F2A2E] text-[#5EE6B5] border-[#38324E]"       };
  if (id.startsWith("edgar-"))    return { label: "EDGAR",          style: "bg-[#201B2E] text-[#9A93AC] border-[#38324E]"       };
  if (id.startsWith("adzuna-"))   return { label: "Adzuna",         style: "bg-[#0F2033] text-[#A78BFA] border-[#38324E]"        };
  if (id.startsWith("muse-"))     return { label: "The Muse",       style: "bg-[#2A2338]/70 text-[#9A93AC] border-[#c7c4d8]/50" };
  if (id.startsWith("jobs14-"))   return { label: "LinkedIn/Indeed",style: "bg-[#0F2033] text-[#A78BFA] border-[#38324E]"        };
  if (id.startsWith("fj-"))       return { label: "LinkedIn",       style: "bg-[#171226] text-white border-[#2d5162]"       };
  if (id.startsWith("li-"))       return { label: "LinkedIn",       style: "bg-[#171226] text-white border-[#2d5162]"       };
  return { label: "Board", style: "bg-[#201B2E] text-[#9A93AC] border-[#38324E]" };
}

function ScoreBadge({ score }: { score: number }) {
  const bg   = score >= 80 ? "bg-[#F43F5E]" : score >= 65 ? "bg-[#F59E0B]" : score >= 50 ? "bg-yellow-400" : "bg-[#201B2E]";
  const text = score >= 50 ? "text-white" : "text-[#9A93AC]";
  return (
    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
      <span className={`font-bold text-[11px] tabular-nums ${text}`}>{score}</span>
    </div>
  );
}

export default function JobRow({ signal }: Props) {
  const src = sourceInfo(signal.id);
  return (
    <div className="grid grid-cols-[40px_1fr_130px_100px_72px_130px_72px] gap-3 px-4 py-3 border-b border-[#38324E] last:border-0 items-center hover:bg-[#201B2E]/60 transition-colors group">
      {/* Score */}
      <ScoreBadge score={signal.score} />

      {/* Firm + role + source + why */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[#F4F0FA] text-sm">{signal.firm}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${src.style}`}>{src.label}</span>
        </div>
        <div className="text-sm text-[#9A93AC] mt-0.5">{signal.role}</div>
        <p className="text-xs text-[#8A8398] mt-0.5 truncate">
          <span className="text-[#A78BFA]">→ </span>{signal.why}
        </p>
      </div>

      {/* Category */}
      <div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${CATEGORY_STYLE[signal.category]}`}>
          {signal.category}
        </span>
      </div>

      {/* Location + salary */}
      <div className="text-xs text-[#9A93AC]">
        <div>{signal.location}</div>
        {signal.salaryRange && <div className="text-[#5EE6B5] font-medium mt-0.5">{signal.salaryRange}</div>}
      </div>

      {/* Days ago */}
      <div className="text-xs text-[#8A8398] tabular-nums">{agoLabel(signal.daysAgo)}</div>

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
            className="text-[10px] text-gray-300 group-hover:text-[#A78BFA] transition-colors font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {signal.id.startsWith("edgar-") ? "EDGAR ↗" : "Apply ↗"}
          </a>
        )}
      </div>
    </div>
  );
}
