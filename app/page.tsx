"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import SearchBar from "@/app/components/SearchBar";
import FundRow from "@/app/components/FundCard";
import StartupRow from "@/app/components/StartupCard";
import JobRow from "@/app/components/JobRow";
import FundFilterBar from "@/app/components/Filters";
import StartupFilterBar from "@/app/components/StartupFilters";
import {
  FundFiling,
  StartupFiling,
  SearchFilters,
  StartupSearchFilters,
  OutreachRecord,
  JobSignal,
  JobFilters,
  JobCategory,
  JobSignalTag,
} from "@/app/types";
import { exportToCsv } from "@/app/lib/export";

const DEFAULT_FUND_FILTERS: SearchFilters = {
  query: "", strategy: "all", dateRange: "90", bucket: "all", minAmount: "",
};
const DEFAULT_STARTUP_FILTERS: StartupSearchFilters = {
  query: "", stage: "all", dateRange: "90", bucket: "all", minAmount: "",
};
const DEFAULT_JOB_FILTERS: JobFilters = {
  category: "all", dateRange: "90", signalTag: "all",
};

function useOutreachTracker() {
  const [records, setRecords] = useState<Record<string, OutreachRecord>>({});
  useEffect(() => {
    try {
      const stored = localStorage.getItem("outreach-records-v2");
      if (stored) setRecords(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);
  const updateRecord = useCallback((record: OutreachRecord) => {
    setRecords((prev) => {
      const next = { ...prev, [record.filingId]: record };
      localStorage.setItem("outreach-records-v2", JSON.stringify(next));
      return next;
    });
  }, []);
  return { records, updateRecord };
}

type TopTab = "funds" | "startups" | "jobs";

export default function Home() {
  const [topTab, setTopTab] = useState<TopTab>("funds");

  const [fundFilters, setFundFilters] = useState<SearchFilters>(DEFAULT_FUND_FILTERS);
  const [fundFilings, setFundFilings] = useState<FundFiling[]>([]);
  const [fundTotal, setFundTotal] = useState(0);
  const [fundLoading, setFundLoading] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);
  const [fundSubTab, setFundSubTab] = useState<"search" | "pipeline">("search");

  const [startupFilters, setStartupFilters] = useState<StartupSearchFilters>(DEFAULT_STARTUP_FILTERS);
  const [startupFilings, setStartupFilings] = useState<StartupFiling[]>([]);
  const [startupTotal, setStartupTotal] = useState(0);
  const [startupLoading, setStartupLoading] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);

  const [jobFilters, setJobFilters] = useState<JobFilters>(DEFAULT_JOB_FILTERS);
  const [jobSignals, setJobSignals] = useState<JobSignal[]>([]);
  const [jobTotal, setJobTotal] = useState(0);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobSources, setJobSources] = useState<string[]>([]);

  const { records, updateRecord } = useOutreachTracker();
  const fundDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startupDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jobDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fundFetchedRef = useRef(false);
  const startupFetchedRef = useRef(false);
  const jobFetchedRef = useRef(false);

  const fetchFunds = useCallback(async (f: SearchFilters) => {
    setFundLoading(true); setFundError(null);
    try {
      const params = new URLSearchParams({ query: f.query, strategy: f.strategy, dateRange: f.dateRange, bucket: f.bucket, minAmount: f.minAmount });
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setFundFilings(data.filings || []); setFundTotal(data.total || 0);
    } catch (err) { setFundError(err instanceof Error ? err.message : "Failed"); }
    finally { setFundLoading(false); }
  }, []);

  const fetchStartups = useCallback(async (f: StartupSearchFilters) => {
    setStartupLoading(true); setStartupError(null);
    try {
      const params = new URLSearchParams({ query: f.query, stage: f.stage, dateRange: f.dateRange, bucket: f.bucket, minAmount: f.minAmount });
      const res = await fetch(`/api/startups?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setStartupFilings(data.filings || []); setStartupTotal(data.total || 0);
    } catch (err) { setStartupError(err instanceof Error ? err.message : "Failed"); }
    finally { setStartupLoading(false); }
  }, []);

  const fetchJobs = useCallback(async (f: JobFilters) => {
    setJobLoading(true); setJobError(null);
    try {
      const params = new URLSearchParams({ dateRange: f.dateRange, category: f.category, signalTag: f.signalTag });
      const res = await fetch(`/api/jobs?${params}`);
      const text = await res.text();
      let data: { signals?: JobSignal[]; total?: number; sources?: string[]; error?: string };
      try { data = JSON.parse(text); } catch { throw new Error("Jobs service unavailable"); }
      if (!res.ok) throw new Error(data.error || "Search failed");
      setJobSignals(data.signals || []); setJobTotal(data.total || 0); setJobSources(data.sources || []);
    } catch (err) { setJobError(err instanceof Error ? err.message : "Failed"); }
    finally { setJobLoading(false); }
  }, []);

  useEffect(() => {
    if (fundDebounceRef.current) clearTimeout(fundDebounceRef.current);
    fundDebounceRef.current = setTimeout(() => { fundFetchedRef.current = true; fetchFunds(fundFilters); }, 400);
    return () => { if (fundDebounceRef.current) clearTimeout(fundDebounceRef.current); };
  }, [fundFilters, fetchFunds]);

  useEffect(() => {
    if (topTab !== "startups") return;
    if (startupDebounceRef.current) clearTimeout(startupDebounceRef.current);
    startupDebounceRef.current = setTimeout(() => { startupFetchedRef.current = true; fetchStartups(startupFilters); }, 400);
    return () => { if (startupDebounceRef.current) clearTimeout(startupDebounceRef.current); };
  }, [startupFilters, fetchStartups, topTab]);

  useEffect(() => {
    if (topTab !== "jobs") return;
    if (jobDebounceRef.current) clearTimeout(jobDebounceRef.current);
    jobDebounceRef.current = setTimeout(() => { jobFetchedRef.current = true; fetchJobs(jobFilters); }, 400);
    return () => { if (jobDebounceRef.current) clearTimeout(jobDebounceRef.current); };
  }, [jobFilters, fetchJobs, topTab]);

  useEffect(() => {
    if (topTab === "startups" && !startupFetchedRef.current) { startupFetchedRef.current = true; fetchStartups(startupFilters); }
    if (topTab === "jobs" && !jobFetchedRef.current) { jobFetchedRef.current = true; fetchJobs(jobFilters); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topTab]);

  const outreachRecords = Object.values(records).filter((r) => r.status !== "not_contacted");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-slate-900 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-5 h-12 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-base tracking-tight">Onlu</span>
            <span className="text-slate-400 text-xs font-medium tracking-wide uppercase">Intel</span>
          </div>
          <div className="w-px h-4 bg-slate-700" />
          <nav className="flex items-center gap-1">
            <NavTab active={topTab === "funds"} onClick={() => setTopTab("funds")} label="Funds" />
            <NavTab active={topTab === "startups"} onClick={() => setTopTab("startups")} label="Startups" />
            <NavTab active={topTab === "jobs"} onClick={() => setTopTab("jobs")} label="Market Hiring" badge />
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-5 py-5">
          {topTab === "funds" && (
            <>
              <h1 className="text-white text-xl font-semibold">Find funds hiring before the job is posted.</h1>
              <p className="text-slate-400 text-sm mt-1 max-w-lg">We track SEC Form D filings — the capital signal that precedes almost every senior buy-side hire. Ranked by urgency, updated daily.</p>
            </>
          )}
          {topTab === "startups" && (
            <>
              <h1 className="text-white text-xl font-semibold">Follow the money. Get there first.</h1>
              <p className="text-slate-400 text-sm mt-1 max-w-lg">Companies that just closed a round are in the 90-day hiring window. We surface fresh Form D equity raises so you can reach out before roles hit LinkedIn.</p>
            </>
          )}
          {topTab === "jobs" && (
            <>
              <h1 className="text-white text-xl font-semibold">Live hiring signals across credit, equity, and quant.</h1>
              <p className="text-slate-400 text-sm mt-1 max-w-lg">Real postings and inferred roles from funds actively raising or post-close — aggregated from multiple sources, updated daily.</p>
            </>
          )}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-5 py-5 space-y-4">
        {topTab === "funds" && (
          <FundsSection
            filters={fundFilters} setFilters={setFundFilters}
            filings={fundFilings} total={fundTotal}
            loading={fundLoading} error={fundError}
            records={records} updateRecord={updateRecord}
            outreachRecords={outreachRecords}
            subTab={fundSubTab} setSubTab={setFundSubTab}
            onExport={() => exportToCsv(fundFilings, records)}
          />
        )}
        {topTab === "startups" && (
          <StartupsSection
            filters={startupFilters} setFilters={setStartupFilters}
            filings={startupFilings} total={startupTotal}
            loading={startupLoading} error={startupError}
            records={records} updateRecord={updateRecord}
          />
        )}
        {topTab === "jobs" && (
          <JobsSection
            filters={jobFilters} setFilters={setJobFilters}
            signals={jobSignals} total={jobTotal}
            loading={jobLoading} error={jobError}
            sources={jobSources}
          />
        )}
      </main>
    </div>
  );
}

function NavTab({ active, onClick, label, badge }: { active: boolean; onClick: () => void; label: string; badge?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-3 py-1 rounded-md text-sm font-medium transition-all ${
        active ? "bg-white text-slate-900" : "text-slate-300 hover:text-white hover:bg-slate-800"
      }`}
    >
      {label}
      {badge && (
        <span className="absolute -top-1 -right-1.5 text-[9px] bg-amber-400 text-amber-900 font-bold px-1 py-0.5 rounded leading-none">
          NEW
        </span>
      )}
    </button>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function fmt(amount?: number): string {
  if (!amount) return "";
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  return `$${(amount / 1_000).toFixed(0)}K`;
}

function SignalChip({ label, color }: { label: string; color: string }) {
  const cls: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-700 border-blue-100",
    green:  "bg-emerald-50 text-emerald-700 border-emerald-100",
    purple: "bg-violet-50 text-violet-700 border-violet-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    gray:   "bg-gray-50 text-gray-600 border-gray-100",
    red:    "bg-red-50 text-red-700 border-red-100",
    amber:  "bg-amber-50 text-amber-700 border-amber-100",
  };
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls[color] ?? cls.gray}`}>{label}</span>;
}

function ErrorBox({ message }: { message: string }) {
  return <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{message}</div>;
}

function EmptyState({ icon, title, hint, onReset }: { icon: string; title: string; hint: string; onReset?: () => void }) {
  return (
    <div className="text-center py-14 text-gray-400">
      <div className="text-3xl mb-3">{icon}</div>
      <p className="font-semibold text-gray-700 text-sm">{title}</p>
      <p className="text-xs mt-1.5 text-gray-400 max-w-xs mx-auto">{hint}</p>
      {onReset && (
        <button
          onClick={onReset}
          className="mt-4 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          Reset filters
        </button>
      )}
      <p className="text-[11px] text-gray-300 mt-3">EDGAR data refreshes daily</p>
    </div>
  );
}

function ScoreTooltip() {
  return (
    <span className="group relative inline-flex items-center cursor-help">
      <span className="text-[10px] text-gray-300 border border-gray-200 rounded px-1 py-0.5 ml-1 hover:border-gray-400 hover:text-gray-500 transition-colors">?</span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-900 text-white text-[11px] rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 leading-relaxed shadow-lg">
        Signal score 1–10. Combines recency of SEC filing, fund size, offering status, and expansion signals. 8+ = act now. 6–8 = worth a reach-out. Under 6 = early signal.
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </span>
    </span>
  );
}

function SkeletonRows({ cols }: { cols: number }) {
  const colCls = cols === 6 ? "grid-cols-[56px_1fr_140px_160px_100px_72px]" : cols === 7 ? "grid-cols-[1fr_150px_120px_80px_130px_80px]" : "grid-cols-6";
  return (
    <div className="divide-y divide-gray-100">
      {[...Array(6)].map((_, i) => (
        <div key={i} className={`grid ${colCls} gap-3 px-4 py-3 animate-pulse`}>
          <div className="space-y-1.5"><div className="h-3.5 bg-gray-100 rounded w-2/3" /><div className="h-3 bg-gray-50 rounded w-1/2" /></div>
          <div className="h-5 bg-gray-100 rounded-full w-20" />
          <div className="h-3 bg-gray-100 rounded w-12" />
          <div className="h-3 bg-gray-100 rounded w-10" />
          <div className="h-5 bg-gray-100 rounded w-24" />
          <div className="h-3 bg-gray-100 rounded w-10" />
        </div>
      ))}
    </div>
  );
}

// ─── Top Opportunities ────────────────────────────────────────────────────────

function TopFundOpportunities({ filings, onClick }: { filings: FundFiling[]; onClick: (id: string) => void }) {
  const top = filings.filter((f) => f.score.overallScore >= 6.0).slice(0, Math.min(5, filings.length));
  if (top.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Top Opportunities This Week</h2>
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">ranked by signal</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
        {top.map((f, i) => (
          <TopFundCard key={f.id} filing={f} rank={i + 1} onClick={() => onClick(f.id)} />
        ))}
      </div>
    </div>
  );
}

function TopFundCard({ filing, rank, onClick }: { filing: FundFiling; rank: number; onClick: () => void }) {
  const { score } = filing;
  const scoreBg = score.bucket === "hot" ? "bg-red-500" : score.bucket === "warm" ? "bg-amber-500" : "bg-yellow-400";
  const chips: Array<{ label: string; color: string }> = [];
  chips.push({ label: filing.formType === "D" ? "Form D" : "Form D/A", color: "blue" });
  if (filing.offeringStatus === "open") chips.push({ label: "In market", color: "green" });
  else if (filing.offeringStatus === "closed") chips.push({ label: "Closed", color: "purple" });
  if (filing.totalOfferingAmount) chips.push({ label: fmt(filing.totalOfferingAmount), color: "gray" });
  return (
    <button onClick={onClick} className="text-left bg-white border border-gray-200 rounded-xl p-3.5 hover:border-blue-200 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between gap-1 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-gray-300 w-4 tabular-nums">{rank}</span>
          <div className={`w-7 h-7 rounded-lg ${scoreBg} flex items-center justify-center flex-shrink-0`}>
            <span className="text-white font-bold text-xs">{score.overallScore}</span>
          </div>
        </div>
        <span className="text-[10px] text-gray-200 group-hover:text-blue-400 transition-colors mt-0.5">↓</span>
      </div>
      <div className="font-semibold text-gray-900 text-xs leading-tight mb-1.5 group-hover:text-blue-700 transition-colors line-clamp-2">
        {filing.entityName}
      </div>
      {score.whyNow[0] && (
        <p className="text-[11px] text-gray-500 mb-2.5 leading-relaxed line-clamp-2">
          <span className="text-blue-500">→ </span>{score.whyNow[0]}
        </p>
      )}
      <div className="flex flex-wrap gap-1">{chips.map((c) => <SignalChip key={c.label} label={c.label} color={c.color} />)}</div>
    </button>
  );
}

function TopStartupOpportunities({ filings, onClick }: { filings: StartupFiling[]; onClick: (id: string) => void }) {
  const top = filings.filter((f) => f.score.overallScore >= 6.0).slice(0, Math.min(5, filings.length));
  if (top.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Top Opportunities This Week</h2>
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">ranked by signal</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
        {top.map((f, i) => (
          <TopStartupCard key={f.id} filing={f} rank={i + 1} onClick={() => onClick(f.id)} />
        ))}
      </div>
    </div>
  );
}

function TopStartupCard({ filing, rank, onClick }: { filing: StartupFiling; rank: number; onClick: () => void }) {
  const { score } = filing;
  const scoreBg = score.bucket === "hot" ? "bg-red-500" : score.bucket === "warm" ? "bg-amber-500" : "bg-yellow-400";
  const chips: Array<{ label: string; color: string }> = [];
  chips.push({ label: filing.stageLabel, color: "indigo" });
  if (filing.offeringStatus === "open") chips.push({ label: "Raising", color: "green" });
  else if (filing.offeringStatus === "closed") chips.push({ label: "Funded", color: "purple" });
  const amt = filing.totalAmountSold ?? filing.totalOfferingAmount;
  if (amt) chips.push({ label: fmt(amt), color: "gray" });
  return (
    <button onClick={onClick} className="text-left bg-white border border-gray-200 rounded-xl p-3.5 hover:border-indigo-200 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between gap-1 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-gray-300 w-4 tabular-nums">{rank}</span>
          <div className={`w-7 h-7 rounded-lg ${scoreBg} flex items-center justify-center flex-shrink-0`}>
            <span className="text-white font-bold text-xs">{score.overallScore}</span>
          </div>
        </div>
        <span className="text-[10px] text-gray-200 group-hover:text-indigo-400 transition-colors mt-0.5">↓</span>
      </div>
      <div className="font-semibold text-gray-900 text-xs leading-tight mb-1.5 group-hover:text-indigo-700 transition-colors line-clamp-2">
        {filing.entityName}
      </div>
      {score.whyNow[0] && (
        <p className="text-[11px] text-gray-500 mb-2.5 leading-relaxed line-clamp-2">
          <span className="text-indigo-500">→ </span>{score.whyNow[0]}
        </p>
      )}
      <div className="flex flex-wrap gap-1">{chips.map((c) => <SignalChip key={c.label} label={c.label} color={c.color} />)}</div>
    </button>
  );
}

// ─── Funds section ────────────────────────────────────────────────────────────

function FundsSection({
  filters, setFilters, filings, total, loading, error,
  records, updateRecord, outreachRecords, subTab, setSubTab, onExport,
}: {
  filters: SearchFilters; setFilters: (f: SearchFilters) => void;
  filings: FundFiling[]; total: number; loading: boolean; error: string | null;
  records: Record<string, OutreachRecord>; updateRecord: (r: OutreachRecord) => void;
  outreachRecords: OutreachRecord[];
  subTab: "search" | "pipeline"; setSubTab: (t: "search" | "pipeline") => void;
  onExport: () => void;
}) {
  const [highlightId, setHighlightId] = useState<string | null>(null);

  return (
    <>
      {subTab === "search" && filings.length > 0 && !loading && (
        <TopFundOpportunities filings={filings} onClick={(id) => {
          setHighlightId(id);
          setTimeout(() => document.getElementById(`fund-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
        }} />
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-200 rounded-lg p-0.5">
          <button onClick={() => setSubTab("search")} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${subTab === "search" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Search</button>
          <button onClick={() => setSubTab("pipeline")} className={`relative px-3 py-1 rounded-md text-xs font-medium transition-all ${subTab === "pipeline" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            Pipeline
            {outreachRecords.length > 0 && <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">{outreachRecords.length}</span>}
          </button>
        </div>
        <p className="text-xs text-gray-400">Capital &amp; hiring signals · SEC Form D</p>
      </div>

      {subTab === "search" ? (
        <>
          <SearchBar value={filters.query} onChange={(q) => setFilters({ ...filters, query: q })} loading={loading} />
          <FundFilterBar filters={filters} onChange={setFilters} total={total} loading={loading} onExport={onExport} />
          {error && <ErrorBox message={error} />}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[56px_1fr_140px_160px_100px_72px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Score<ScoreTooltip /></div>
              {["Fund / Firm", "Strategy", "Fundraising", "Location", "Updated"].map((h) => (
                <div key={h} className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</div>
              ))}
            </div>
            {loading && filings.length === 0 && <SkeletonRows cols={6} />}
            {!loading && filings.length === 0 && !error && (
              <EmptyState
                icon="📋"
                title="No funds matched your current filters."
                hint="Try expanding the date range to 6 months or removing the strategy filter."
                onReset={() => setFilters({ query: "", strategy: "all", dateRange: "180", bucket: "all", minAmount: "" })}
              />
            )}
            {filings.map((f) => (
              <div key={f.id} id={`fund-row-${f.id}`}>
                <FundRow filing={f} outreach={records[f.id]} onOutreachChange={updateRecord} autoExpand={highlightId === f.id} />
              </div>
            ))}
          </div>
          {filings.length > 0 && <p className="text-center text-xs text-gray-400 py-1">Source: <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=D" target="_blank" rel="noopener noreferrer" className="underline">SEC EDGAR Form D</a> · Hiring signals in Phase 2</p>}
        </>
      ) : (
        <OutreachPipeline records={outreachRecords} onBack={() => setSubTab("search")} />
      )}
    </>
  );
}

// ─── Startups section ─────────────────────────────────────────────────────────

function StartupsSection({
  filters, setFilters, filings, total, loading, error, records, updateRecord,
}: {
  filters: StartupSearchFilters; setFilters: (f: StartupSearchFilters) => void;
  filings: StartupFiling[]; total: number; loading: boolean; error: string | null;
  records: Record<string, OutreachRecord>; updateRecord: (r: OutreachRecord) => void;
}) {
  const [highlightId, setHighlightId] = useState<string | null>(null);

  return (
    <>
      {filings.length > 0 && !loading && (
        <TopStartupOpportunities filings={filings} onClick={(id) => {
          setHighlightId(id);
          setTimeout(() => document.getElementById(`startup-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
        }} />
      )}

      <div className="flex items-center justify-between">
        <span />
        <p className="text-xs text-gray-400">Funding &amp; hiring signals · SEC Form D</p>
      </div>

      <SearchBar value={filters.query} onChange={(q) => setFilters({ ...filters, query: q })} loading={loading}
        placeholder='Search — "Series B", "fintech", "healthtech"…'
        quickSearches={["Series A", "Series B", "seed round", "fintech", "healthtech", "SaaS", "AI", "climate tech"]} />
      <StartupFilterBar filters={filters} onChange={setFilters} total={total} loading={loading} />
      {error && <ErrorBox message={error} />}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[56px_1fr_110px_150px_100px_72px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Score<ScoreTooltip /></div>
          {["Company", "Stage", "Funding", "Location", "Updated"].map((h) => (
            <div key={h} className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</div>
          ))}
        </div>
        {loading && filings.length === 0 && <SkeletonRows cols={6} />}
        {!loading && filings.length === 0 && !error && (
          <EmptyState
            icon="🚀"
            title="No startups matched your current filters."
            hint="Try expanding the date range to 6 months or removing the stage filter."
            onReset={() => setFilters({ query: "", stage: "all", dateRange: "180", bucket: "all", minAmount: "" })}
          />
        )}
        {filings.map((f) => (
          <div key={f.id} id={`startup-row-${f.id}`}>
            <StartupRow filing={f} outreach={records[f.id]} onOutreachChange={updateRecord} autoExpand={highlightId === f.id} />
          </div>
        ))}
      </div>
      {filings.length > 0 && <p className="text-center text-xs text-gray-400 py-1">Source: <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=D" target="_blank" rel="noopener noreferrer" className="underline">SEC EDGAR Form D</a> · Hiring signals in Phase 2</p>}
    </>
  );
}

// ─── Market Hiring section ────────────────────────────────────────────────────

const JOB_CATEGORIES: Array<{ v: "all" | JobCategory; l: string }> = [
  { v: "all", l: "All" },
  { v: "Credit", l: "Credit" },
  { v: "Equity", l: "Equity" },
  { v: "Equity Research", l: "Equity Research" },
  { v: "Quant", l: "Quant" },
  { v: "IR / Ops", l: "IR / Ops" },
];

const JOB_SIGNAL_TAGS: Array<{ v: "all" | JobSignalTag; l: string }> = [
  { v: "all", l: "All signals" },
  { v: "In-market raise", l: "In-market raise" },
  { v: "Post-raise build-out", l: "Post-raise" },
  { v: "Fund scaling", l: "Fund scaling" },
  { v: "New fund", l: "New fund" },
];

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  adzuna:  { label: "Adzuna",    color: "bg-blue-50 text-blue-700 border-blue-200" },
  muse:    { label: "The Muse",  color: "bg-purple-50 text-purple-700 border-purple-200" },
  jsearch: { label: "JSearch",   color: "bg-green-50 text-green-700 border-green-200" },
  edgar:   { label: "EDGAR",     color: "bg-gray-50 text-gray-600 border-gray-200" },
};

function JobsSection({
  filters, setFilters, signals, total, loading, error, sources,
}: {
  filters: JobFilters; setFilters: (f: JobFilters) => void;
  signals: JobSignal[]; total: number; loading: boolean; error: string | null;
  sources: string[];
}) {
  const liveSourceCount = sources.filter((s) => s !== "edgar").length;
  const edgarOnly = !loading && sources.length > 0 && liveSourceCount === 0;

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {JOB_CATEGORIES.map((c) => (
          <button key={c.v} onClick={() => setFilters({ ...filters, category: c.v === filters.category && c.v !== "all" ? "all" : c.v })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              filters.category === c.v ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}>
            {c.l}
          </button>
        ))}
        <div className="w-px h-5 bg-gray-200 hidden sm:block" />
        {JOB_SIGNAL_TAGS.map((t) => (
          <button key={t.v} onClick={() => setFilters({ ...filters, signalTag: t.v === filters.signalTag && t.v !== "all" ? "all" : t.v })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              filters.signalTag === t.v ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}>
            {t.l}
          </button>
        ))}
        <div className="w-px h-5 bg-gray-200 hidden sm:block" />
        <select value={filters.dateRange} onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as JobFilters["dateRange"] })}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-900">
          <option value="14">Last 14d</option>
          <option value="30">Last 30d</option>
          <option value="60">Last 60d</option>
          <option value="90">Last 90d</option>
        </select>
        <span className="ml-auto text-xs text-gray-400">{loading ? "Loading…" : `${total} signal${total !== 1 ? "s" : ""}`}</span>
      </div>

      {error && <ErrorBox message={error} />}

      {/* Source badges */}
      {!loading && sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Sources:</span>
          {sources.map((src) => {
            const meta = SOURCE_LABELS[src] || { label: src, color: "bg-gray-50 text-gray-600 border-gray-200" };
            return (
              <span key={src} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${meta.color}`}>
                {meta.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Setup prompt (EDGAR-only mode) */}
      {edgarOnly && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-800">
          <p className="font-semibold mb-1">Add real job board data</p>
          <p className="mb-2">Currently showing inferred roles from SEC EDGAR signals only. To include live listings from Adzuna, The Muse, and JSearch, add API keys to <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">.env.local</code>:</p>
          <pre className="bg-blue-100 rounded px-3 py-2 font-mono text-[11px] leading-relaxed overflow-x-auto">{`ADZUNA_APP_ID=your_id       # developer.adzuna.com (free)\nADZUNA_APP_KEY=your_key\nRAPIDAPI_KEY=your_key       # rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch (free tier)`}</pre>
        </div>
      )}

      {/* Inferred-only notice */}
      {!edgarOnly && sources.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5 text-xs text-amber-800 flex items-start gap-2">
          <span className="mt-0.5">ℹ</span>
          <span>EDGAR-inferred roles are included alongside live listings. They signal likely hiring based on recent capital raises — not scraped from job boards.</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_150px_120px_80px_130px_80px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          {["Firm / Role", "Category", "Location", "Filed", "Signal", ""].map((h) => (
            <div key={h} className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</div>
          ))}
        </div>
        {loading && signals.length === 0 && <SkeletonRows cols={7} />}
        {!loading && signals.length === 0 && !error && (
          <EmptyState icon="📊" title="No hiring signals found" hint="Try expanding the date range or switching category" />
        )}
        {signals.map((s) => <JobRow key={s.id} signal={s} />)}
      </div>

      {signals.length > 0 && (
        <p className="text-center text-xs text-gray-400 py-1">
          Capital signals from <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=D" target="_blank" rel="noopener noreferrer" className="underline">SEC EDGAR Form D</a> · Live listings from Adzuna, The Muse, JSearch
        </p>
      )}
    </>
  );
}

// ─── Outreach pipeline ────────────────────────────────────────────────────────

function OutreachPipeline({ records, onBack }: { records: OutreachRecord[]; onBack: () => void }) {
  if (records.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 bg-white border border-gray-200 rounded-xl">
        <div className="text-3xl mb-3">📬</div>
        <p className="font-medium text-gray-600">No outreach tracked yet</p>
        <p className="text-sm mt-1">Open a fund row and set its status to start tracking</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">Search Funds</button>
      </div>
    );
  }
  const groups = {
    in_discussion: records.filter((r) => r.status === "in_discussion"),
    reached_out:   records.filter((r) => r.status === "reached_out"),
    passed:        records.filter((r) => r.status === "passed"),
  };
  return (
    <div className="space-y-5">
      {(["in_discussion", "reached_out", "passed"] as const).map((status) => {
        const group = groups[status];
        if (!group.length) return null;
        const titles = { in_discussion: "In Discussion", reached_out: "Reached Out", passed: "Passed" };
        const colors = { in_discussion: "text-green-700 bg-green-50 border-green-200", reached_out: "text-blue-700 bg-blue-50 border-blue-200", passed: "text-gray-600 bg-gray-50 border-gray-200" };
        return (
          <div key={status}>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{titles[status]} <span className="font-normal">({group.length})</span></h2>
            <div className="space-y-1.5">
              {group.map((r) => (
                <div key={r.filingId} className={`border rounded-lg px-4 py-2.5 ${colors[status]}`}>
                  <div className="flex items-center justify-between">
                    <div><span className="font-medium text-sm">{r.entityName}</span>{r.strategy && <span className="text-xs opacity-60 ml-2">{r.strategy}</span>}</div>
                    {r.contactedAt && <span className="text-xs opacity-50">{new Date(r.contactedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                  </div>
                  {r.notes && <p className="text-xs italic mt-1 opacity-70">{r.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
