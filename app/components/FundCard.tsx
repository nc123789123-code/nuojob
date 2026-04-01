"use client";

import { useState, useEffect } from "react";
import { FundFiling, OutreachRecord, NewsArticle } from "@/app/types";

interface Props {
  filing: FundFiling;
  outreach?: OutreachRecord;
  onOutreachChange: (record: OutreachRecord) => void;
  autoExpand?: boolean;
  openRolesCount?: number;
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

function newsAgo(pubDate: string): string {
  try {
    const days = Math.floor((Date.now() - new Date(pubDate).getTime()) / 86400000);
    return ago(days);
  } catch { return ""; }
}

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

function NewsPanel({ entityName }: { entityName: string }) {
  const [articles, setArticles] = useState<NewsArticle[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/news?firm=${encodeURIComponent(entityName)}`)
      .then((r) => r.json())
      .then((d) => setArticles(d.articles ?? []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [entityName]);

  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent News</p>
      {loading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${70 + i * 10}%` }} />
          ))}
        </div>
      )}
      {!loading && articles && articles.length === 0 && (
        <p className="text-xs text-gray-400 italic">No recent news found for this firm.</p>
      )}
      {!loading && articles && articles.length > 0 && (
        <div className="space-y-2">
          {articles.map((a, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`mt-0.5 flex-shrink-0 text-[10px] font-bold px-1 py-0.5 rounded ${
                a.tag === "fundraising"
                  ? "bg-sky-100 text-[#396477]"
                  : "bg-[#c3ecd7]/60 text-[#416656]"
              }`}>
                {a.tag === "fundraising" ? "Raise" : "Hire"}
              </span>
              <div className="min-w-0">
                <a
                  href={a.link || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-gray-700 hover:text-[#396477] transition-colors leading-snug line-clamp-2"
                >
                  {a.title}
                </a>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {a.source && <span className="text-[10px] text-gray-400">{a.source}</span>}
                  {a.pubDate && <span className="text-[10px] text-gray-300">· {newsAgo(a.pubDate)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FundRow({ filing, outreach, onOutreachChange, autoExpand, openRolesCount }: Props) {
  const [expanded, setExpanded] = useState(autoExpand ?? false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(outreach?.notes || "");

  useEffect(() => { if (autoExpand) setExpanded(true); }, [autoExpand]);

  const outreachStatus = outreach?.status || "not_contacted";

  const fundraisingLabel = (() => {
    if (filing.totalAmountSold && filing.totalAmountSold > 0 && filing.totalOfferingAmount) {
      const pct = Math.round((filing.totalAmountSold / filing.totalOfferingAmount) * 100);
      return `${fmt(filing.totalAmountSold)} / ${fmt(filing.totalOfferingAmount)} (${pct}%)`;
    }
    if (filing.totalAmountSold && filing.totalAmountSold > 0) return `Raised ${fmt(filing.totalAmountSold)}`;
    if (filing.totalOfferingAmount) return `${fmt(filing.totalOfferingAmount)} target`;
    if (filing.offeringStatus === "open") return "In market";
    if (filing.offeringStatus === "closed") return "Closed";
    return "Filed";
  })();

  // Status chip
  const statusChip = filing.offeringStatus === "open"
    ? { label: "In market", color: "green" }
    : filing.offeringStatus === "closed"
    ? { label: "Closed raise", color: "purple" }
    : null;

  const chips: Array<{ label: string; color: string }> = [];
  chips.push({ label: filing.formType === "D" ? "New Form D" : "Form D/A", color: "blue" });
  if (statusChip) chips.push(statusChip);
  if (filing.daysSinceFiling <= 14) chips.push({ label: `${filing.daysSinceFiling}d ago`, color: "red" });
  if (filing.totalOfferingAmount && filing.totalOfferingAmount >= 100_000_000) {
    chips.push({ label: fmt(filing.totalOfferingAmount), color: "gray" });
  }

  // Hiring timeline chip
  const hiringChip = (() => {
    const d = filing.daysSinceFiling;
    if (d <= 30)  return { label: "⏰ Outreach now — hiring likely in 30–60d", color: "red" };
    if (d <= 60)  return { label: "🟢 Hiring window open", color: "green" };
    if (d <= 90)  return { label: "📋 Active build-out phase", color: "purple" };
    if (d <= 180) return { label: "🔵 Post-close hiring", color: "blue" };
    return null;
  })();

  const handleStatus = (s: OutreachRecord["status"]) => {
    onOutreachChange({
      filingId: filing.id,
      entityName: filing.entityName,
      strategy: filing.strategyLabel,
      status: s,
      notes,
      contactedAt: s !== "not_contacted" ? outreach?.contactedAt || new Date().toISOString() : undefined,
      score: filing.score.overallScore,
    });
  };

  const saveNotes = () => {
    onOutreachChange({
      filingId: filing.id,
      entityName: filing.entityName,
      strategy: filing.strategyLabel,
      status: outreachStatus,
      notes,
      contactedAt: outreach?.contactedAt,
      score: filing.score.overallScore,
    });
    setShowNotes(false);
  };

  return (
    <div className={`border-b border-gray-100 last:border-0 ${expanded ? "bg-sky-50/20" : "hover:bg-gray-50/60"} transition-colors`}>
      {/* Collapsed row — 4 columns, no score */}
      <div
        className="grid grid-cols-[1fr_140px_160px_72px] gap-3 px-4 py-3 cursor-pointer items-start"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Fund name + Why Now + chips */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm leading-tight">{filing.entityName}</span>
            {outreachStatus !== "not_contacted" && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${OUTREACH_CFG[outreachStatus].cls}`}>
                {OUTREACH_CFG[outreachStatus].label}
              </span>
            )}
          </div>
          {filing.score.whyNow[0] && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              <span className="text-[#396477]">→ </span>{filing.score.whyNow[0]}
            </p>
          )}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {chips.map((c) => <SignalChip key={c.label} label={c.label} color={c.color} />)}
            {hiringChip && <SignalChip key="hiring-timeline" label={hiringChip.label} color={hiringChip.color} />}
            {openRolesCount != null && openRolesCount > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-[#c3ecd7]/60 text-[#416656] border-[#a8cfbc]/50">
                {openRolesCount} role{openRolesCount !== 1 ? "s" : ""} →
              </span>
            )}
          </div>
        </div>

        {/* Strategy */}
        <div className="pt-0.5">
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium whitespace-nowrap">
            {filing.strategyLabel}
          </span>
        </div>

        {/* Fundraising */}
        <div className="pt-0.5">
          <div className="text-sm text-gray-700 truncate">{fundraisingLabel}</div>
          {filing.totalAmountSold && filing.totalOfferingAmount && filing.totalAmountSold > 0 && (
            <div className="mt-1 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-1 rounded-full bg-[#396477]"
                style={{ width: `${Math.min(100, Math.round((filing.totalAmountSold / filing.totalOfferingAmount) * 100))}%` }}
              />
            </div>
          )}
        </div>

        {/* Filed */}
        <div className="text-xs text-gray-400 pt-0.5">{ago(filing.daysSinceFiling)}</div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-5 pt-2 border-t border-sky-100/40 bg-white space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            {/* Why Now */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Why Now</p>
              <ul className="space-y-1.5">
                {filing.score.whyNow.map((item, i) => (
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
                &ldquo;{filing.score.suggestedAngle}&rdquo;
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {filing.score.suggestedTargetTeams.map((t) => (
                  <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Recent News — fetched on expand */}
          <NewsPanel entityName={filing.entityName} />

          {/* Key people from Form D */}
          {filing.relatedPersons && filing.relatedPersons.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Key People (Form D)</p>
              <div className="flex flex-wrap gap-2">
                {filing.relatedPersons.slice(0, 5).map((p, i) => {
                  const fullName = [p.firstName, p.lastName].filter(Boolean).join(" ");
                  const liSearch = fullName
                    ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(fullName + " " + filing.entityName)}`
                    : undefined;
                  const gSearch = fullName
                    ? `https://www.google.com/search?q=${encodeURIComponent(fullName + " " + filing.entityName)}`
                    : undefined;
                  return (
                    <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-100">
                      <div className="font-medium text-gray-800">{fullName || "—"}</div>
                      {p.title && <div className="text-xs text-gray-500">{p.title}</div>}
                      {p.city && <div className="text-xs text-gray-400">{p.city}{p.state ? `, ${p.state}` : ""}</div>}
                      {fullName && (
                        <div className="flex gap-2 mt-1.5">
                          {liSearch && (
                            <a href={liSearch} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] text-sky-600 hover:underline">
                              LinkedIn ↗
                            </a>
                          )}
                          {gSearch && (
                            <a href={gSearch} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] text-gray-400 hover:underline">
                              Google ↗
                            </a>
                          )}
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
                <a
                  href={filing.website.startsWith("http") ? filing.website : `https://${filing.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[#396477] hover:underline"
                >
                  🌐 {filing.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              )}
            </div>
          )}

          {/* Outreach tracking */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Track Outreach</p>
            <div className="flex flex-wrap gap-2">
              {(["not_contacted", "reached_out", "in_discussion", "passed"] as OutreachRecord["status"][]).map((s) => (
                <button
                  key={s}
                  onClick={(e) => { e.stopPropagation(); handleStatus(s); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    outreachStatus === s
                      ? `${OUTREACH_CFG[s].cls} border-current`
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {OUTREACH_CFG[s].label}
                </button>
              ))}
              <button
                onClick={(e) => { e.stopPropagation(); setShowNotes(!showNotes); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:border-gray-300"
              >
                {notes ? "Edit notes" : "Add notes"}
              </button>
              <a
                href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${filing.cik}&type=D&dateb=&owner=include&count=40`}
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
                  placeholder="Notes — contact info, convo details, timing…"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#396477]"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button onClick={saveNotes} className="px-3 py-1.5 bg-[#396477] text-white rounded-lg text-xs font-medium hover:bg-[#2d5162]">Save</button>
                  <button onClick={() => setShowNotes(false)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200">Cancel</button>
                </div>
              </div>
            )}
            {notes && !showNotes && (
              <p className="mt-2 text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">{notes}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
