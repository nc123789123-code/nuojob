"use client";

import { useEffect, useState } from "react";
import LogoMark from "@/app/components/LogoMark";

interface TopJob {
  role: string;
  firm: string;
  location?: string;
  daysAgo?: number;
  url?: string;
}

interface TopFund {
  name: string;
  totalOfferingAmount?: number;
  daysSinceFiling?: number;
}

interface DailyData {
  todayCount: number;
  weekCount: number;
  topFunds: TopFund[];
  topJobs: TopJob[];
  lastUpdated: string;
}

interface JobSignal {
  firm: string;
  role: string;
  location?: string;
  daysAgo?: number;
  edgarUrl?: string;
  classification?: { frontOffice?: boolean; seniority?: string };
}

function fmt(n?: number): string {
  if (!n) return "";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

function weekLabel(): string {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 13);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${now.toLocaleDateString("en-US", opts)}, ${now.getFullYear()}`;
}

function ShareButton({ platform, url, text }: { platform: "linkedin" | "twitter"; url: string; text: string }) {
  const href = platform === "linkedin"
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    : `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
        platform === "linkedin"
          ? "bg-[#0A66C2] hover:bg-[#004182] text-white"
          : "bg-[#1DA1F2] hover:bg-[#0c85d0] text-white"
      }`}>
      {platform === "linkedin" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      )}
      {platform === "linkedin" ? "Share on LinkedIn" : "Post on X"}
    </a>
  );
}

export default function ThisWeekPage() {
  const [daily, setDaily] = useState<DailyData | null>(null);
  const [jobs, setJobs] = useState<JobSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const baseUrl = "https://onluintel.com";

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/daily").then(r => r.json()),
      fetch("/api/jobs?dateRange=14&category=all&signalTag=all").then(r => r.json()),
    ]).then(([d, j]) => {
      if (d.status === "fulfilled") setDaily(d.value);
      if (j.status === "fulfilled") setJobs(j.value.signals || []);
    }).finally(() => setLoading(false));
  }, []);

  // Group jobs by firm, sort by count
  const jobsByFirm = new Map<string, JobSignal[]>();
  for (const job of jobs) {
    if (!jobsByFirm.has(job.firm)) jobsByFirm.set(job.firm, []);
    jobsByFirm.get(job.firm)!.push(job);
  }
  const firmGroups = Array.from(jobsByFirm.entries()).sort((a, b) => b[1].length - a[1].length).slice(0, 8);
  const totalRoles = jobs.length;
  const totalFirmsHiring = jobsByFirm.size;
  const topFunds = daily?.topFunds?.slice(0, 5) || [];

  const shareText = `📊 Finance hiring pulse this week:\n• ${totalFirmsHiring} firms actively hiring\n• ${totalRoles} front-office roles posted\n• ${topFunds.length} capital raises tracked\n\nTrack buy-side hiring signals at`;
  const pageUrl = `${baseUrl}/this-week`;

  return (
    <div className="min-h-screen bg-[#f2f4f6]">
      {/* Header */}
      <div className="bg-white border-b border-[#c1c7cc]/40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <LogoMark size={24} />
            <span className="text-sm font-bold text-[#191c1e]">Onlu</span>
          </a>
          <span className="text-xs text-[#71787c]">Weekly Pulse</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Hero card */}
        <div className="bg-white rounded-2xl border border-[#c1c7cc]/40 overflow-hidden shadow-sm">
          <div className="bg-[#396477] px-6 py-5">
            <p className="text-[#c3ecd7] text-xs font-semibold uppercase tracking-widest mb-1">Finance Hiring Pulse</p>
            <h1 className="text-white text-xl font-bold">{weekLabel()}</h1>
          </div>
          {loading ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">Loading signals…</div>
          ) : (
            <div className="grid grid-cols-3 divide-x divide-[#c1c7cc]/30">
              {[
                { label: "Firms Hiring", value: totalFirmsHiring },
                { label: "Roles Posted", value: totalRoles },
                { label: "Capital Raises", value: daily?.weekCount ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-4 text-center">
                  <p className="text-2xl font-bold text-[#191c1e]">{value}</p>
                  <p className="text-[11px] text-[#71787c] mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hiring Now */}
        {!loading && firmGroups.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#c1c7cc]/40 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-[#c1c7cc]/30 flex items-center gap-2">
              <span className="text-sm font-bold text-[#191c1e]">Hiring Now</span>
              <span className="text-[10px] bg-[#c3ecd7] text-[#416656] font-bold px-1.5 py-0.5 rounded">{totalFirmsHiring} firms</span>
            </div>
            <div className="divide-y divide-[#c1c7cc]/20">
              {firmGroups.map(([firmName, firmJobs]) => (
                <div key={firmName} className="px-5 py-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-[#191c1e]">{firmName}</span>
                    <span className="text-[10px] bg-[#c3ecd7] text-[#416656] font-bold px-1.5 py-0.5 rounded">
                      {firmJobs.length} open
                    </span>
                  </div>
                  <div className="space-y-1">
                    {firmJobs.slice(0, 3).map((job, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-[#41484c] truncate">{job.role}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{job.daysAgo}d ago</span>
                      </div>
                    ))}
                    {firmJobs.length > 3 && (
                      <p className="text-[10px] text-[#396477]">+{firmJobs.length - 3} more roles</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {totalFirmsHiring > 8 && (
              <div className="px-5 py-3 border-t border-[#c1c7cc]/20 bg-[#f8fafb]">
                <a href="/" className="text-xs font-semibold text-[#396477] hover:underline">
                  +{totalFirmsHiring - 8} more firms on the platform →
                </a>
              </div>
            )}
          </div>
        )}

        {/* Capital Raises */}
        {!loading && topFunds.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#c1c7cc]/40 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-[#c1c7cc]/30 flex items-center gap-2">
              <span className="text-sm font-bold text-[#191c1e]">Capital Raises</span>
              <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded">EDGAR Form D</span>
            </div>
            <div className="divide-y divide-[#c1c7cc]/20">
              {topFunds.map((fund, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-[#191c1e] truncate">{fund.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 text-right">
                    {fund.totalOfferingAmount && (
                      <span className="text-xs font-semibold text-amber-700">{fmt(fund.totalOfferingAmount)}</span>
                    )}
                    <span className="text-[10px] text-gray-400">{fund.daysSinceFiling}d ago</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-[#c1c7cc]/20 bg-[#f8fafb]">
              <a href="/?tab=capital" className="text-xs font-semibold text-[#396477] hover:underline">
                View all capital signals →
              </a>
            </div>
          </div>
        )}

        {/* Share block */}
        <div className="bg-white rounded-2xl border border-[#c1c7cc]/40 p-5 shadow-sm">
          <p className="text-sm font-bold text-[#191c1e] mb-1">Share this week&apos;s signals</p>
          <p className="text-xs text-[#71787c] mb-4">Help your network know where the opportunities are.</p>
          <div className="flex flex-wrap gap-2">
            <ShareButton platform="linkedin" url={pageUrl} text={shareText} />
            <ShareButton platform="twitter" url={pageUrl} text={shareText} />
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#396477] rounded-2xl p-5 text-center shadow-sm">
          <p className="text-white font-bold text-sm mb-1">See the full picture</p>
          <p className="text-[#c3ecd7] text-xs mb-4">Live roles, fund signals, market data, and interview prep — all in one place.</p>
          <a href="/"
            className="inline-block bg-white text-[#396477] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#f0f7fa] transition-colors">
            Open Onlu →
          </a>
        </div>

        <p className="text-center text-[10px] text-gray-400">
          Data refreshed every 30 minutes · <a href="/" className="hover:underline">onluintel.com</a>
        </p>

      </div>
    </div>
  );
}
