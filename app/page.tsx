"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import SearchBar from "@/app/components/SearchBar";
import FundRow from "@/app/components/FundCard";
import StartupRow from "@/app/components/StartupCard";
import FundFilterBar from "@/app/components/Filters";
import StartupFilterBar from "@/app/components/StartupFilters";
import {
  FundFiling,
  StartupFiling,
  SearchFilters,
  StartupSearchFilters,
  OutreachRecord,
} from "@/app/types";
import { exportToCsv } from "@/app/lib/export";

const DEFAULT_FUND_FILTERS: SearchFilters = {
  query: "",
  strategy: "all",
  dateRange: "90",
  bucket: "all",
  minAmount: "",
};

const DEFAULT_STARTUP_FILTERS: StartupSearchFilters = {
  query: "",
  stage: "all",
  dateRange: "90",
  bucket: "all",
  minAmount: "",
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

type TopTab = "funds" | "startups";

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

  const { records, updateRecord } = useOutreachTracker();
  const fundDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startupDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fundFetchedRef = useRef(false);
  const startupFetchedRef = useRef(false);

  const fetchFunds = useCallback(async (f: SearchFilters) => {
    setFundLoading(true);
    setFundError(null);
    try {
      const params = new URLSearchParams({ query: f.query, strategy: f.strategy, dateRange: f.dateRange, bucket: f.bucket, minAmount: f.minAmount });
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setFundFilings(data.filings || []);
      setFundTotal(data.total || 0);
    } catch (err) {
      setFundError(err instanceof Error ? err.message : "Failed to load results.");
    } finally {
      setFundLoading(false);
    }
  }, []);

  const fetchStartups = useCallback(async (f: StartupSearchFilters) => {
    setStartupLoading(true);
    setStartupError(null);
    try {
      const params = new URLSearchParams({ query: f.query, stage: f.stage, dateRange: f.dateRange, bucket: f.bucket, minAmount: f.minAmount });
      const res = await fetch(`/api/startups?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setStartupFilings(data.filings || []);
      setStartupTotal(data.total || 0);
    } catch (err) {
      setStartupError(err instanceof Error ? err.message : "Failed to load results.");
    } finally {
      setStartupLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fundDebounceRef.current) clearTimeout(fundDebounceRef.current);
    fundDebounceRef.current = setTimeout(() => {
      fundFetchedRef.current = true;
      fetchFunds(fundFilters);
    }, 400);
    return () => { if (fundDebounceRef.current) clearTimeout(fundDebounceRef.current); };
  }, [fundFilters, fetchFunds]);

  useEffect(() => {
    if (topTab !== "startups") return;
    if (startupDebounceRef.current) clearTimeout(startupDebounceRef.current);
    startupDebounceRef.current = setTimeout(() => {
      startupFetchedRef.current = true;
      fetchStartups(startupFilters);
    }, 400);
    return () => { if (startupDebounceRef.current) clearTimeout(startupDebounceRef.current); };
  }, [startupFilters, fetchStartups, topTab]);

  useEffect(() => {
    if (topTab === "startups" && !startupFetchedRef.current) {
      startupFetchedRef.current = true;
      fetchStartups(startupFilters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topTab]);

  const outreachRecords = Object.values(records).filter((r) => r.status !== "not_contacted");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-slate-900 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-5 h-12 flex items-center gap-6">
          <span className="text-white font-bold text-base tracking-tight">Onlu</span>
          <div className="w-px h-4 bg-slate-700" />
          <nav className="flex items-center gap-1">
            <NavTab active={topTab === "funds"} onClick={() => setTopTab("funds")} label="Funds" />
            <NavTab active={topTab === "startups"} onClick={() => setTopTab("startups")} label="Startups" />
          </nav>
          <span className="ml-auto text-xs text-slate-400">
            {topTab === "funds" ? "Capital & Hiring Signals" : "Funding & Hiring Signals"}
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-5 space-y-3">
        {topTab === "funds" ? (
          <FundsSection
            filters={fundFilters} setFilters={setFundFilters}
            filings={fundFilings} total={fundTotal}
            loading={fundLoading} error={fundError}
            records={records} updateRecord={updateRecord}
            outreachRecords={outreachRecords}
            subTab={fundSubTab} setSubTab={setFundSubTab}
            onExport={() => exportToCsv(fundFilings, records)}
          />
        ) : (
          <StartupsSection
            filters={startupFilters} setFilters={setStartupFilters}
            filings={startupFilings} total={startupTotal}
            loading={startupLoading} error={startupError}
            records={records} updateRecord={updateRecord}
          />
        )}
      </main>
    </div>
  );
}

function NavTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
        active ? "bg-white text-slate-900" : "text-slate-300 hover:text-white hover:bg-slate-800"
      }`}
    >
      {label}
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
  return (
    <>
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Funds — Capital &amp; Hiring Signals</h1>
          <p className="text-xs text-gray-400 mt-0.5">Precision signals · fewer rows · deeper insight per row</p>
        </div>
        <div className="flex gap-1 bg-gray-200 rounded-lg p-0.5">
          <button
            onClick={() => setSubTab("search")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${subTab === "search" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Search
          </button>
          <button
            onClick={() => setSubTab("pipeline")}
            className={`relative px-3 py-1 rounded-md text-xs font-medium transition-all ${subTab === "pipeline" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Pipeline
            {outreachRecords.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                {outreachRecords.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {subTab === "search" ? (
        <>
          <SearchBar value={filters.query} onChange={(q) => setFilters({ ...filters, query: q })} loading={loading} />
          <FundFilterBar filters={filters} onChange={setFilters} total={total} loading={loading} onExport={onExport} />

          {error && <ErrorBox message={error} />}

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[56px_1fr_140px_160px_100px_72px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              {["Score", "Fund / Firm", "Strategy", "Fundraising", "Location", "Updated"].map((h) => (
                <div key={h} className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</div>
              ))}
            </div>

            {loading && filings.length === 0 && <SkeletonRows />}
            {!loading && filings.length === 0 && !error && (
              <EmptyState icon="📋" title="No funds found" hint="Try broadening the date range or strategy filter" />
            )}

            {filings.map((f) => (
              <FundRow key={f.id} filing={f} outreach={records[f.id]} onOutreachChange={updateRecord} />
            ))}
          </div>

          {filings.length > 0 && (
            <p className="text-center text-xs text-gray-400 py-2">
              Source:{" "}
              <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=D" target="_blank" rel="noopener noreferrer" className="underline">SEC EDGAR Form D</a>
              {" "}· Hiring signals in Phase 2
            </p>
          )}
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
  return (
    <>
      <div>
        <h1 className="text-base font-semibold text-gray-900">Startups — Funding &amp; Hiring Signals</h1>
        <p className="text-xs text-gray-400 mt-0.5">Velocity signals · more rows · simpler signals</p>
      </div>

      <SearchBar
        value={filters.query}
        onChange={(q) => setFilters({ ...filters, query: q })}
        loading={loading}
        placeholder='Search — "Series B", "fintech", "healthtech"…'
        quickSearches={["Series A", "Series B", "seed round", "fintech", "healthtech", "SaaS", "AI", "climate tech"]}
      />

      <StartupFilterBar filters={filters} onChange={setFilters} total={total} loading={loading} />

      {error && <ErrorBox message={error} />}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[56px_1fr_110px_150px_100px_72px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          {["Score", "Company", "Stage", "Funding", "Location", "Updated"].map((h) => (
            <div key={h} className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</div>
          ))}
        </div>

        {loading && filings.length === 0 && <SkeletonRows />}
        {!loading && filings.length === 0 && !error && (
          <EmptyState icon="🚀" title="No startups found" hint="Try broadening the date range or searching a specific stage" />
        )}

        {filings.map((f) => (
          <StartupRow key={f.id} filing={f} outreach={records[f.id]} onOutreachChange={updateRecord} />
        ))}
      </div>

      {filings.length > 0 && (
        <p className="text-center text-xs text-gray-400 py-2">
          Source:{" "}
          <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=D" target="_blank" rel="noopener noreferrer" className="underline">SEC EDGAR Form D</a>
          {" "}· Stage inferred from raise size · Hiring in Phase 2
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
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
          Search Funds
        </button>
      </div>
    );
  }

  const groups = {
    in_discussion: records.filter((r) => r.status === "in_discussion"),
    reached_out: records.filter((r) => r.status === "reached_out"),
    passed: records.filter((r) => r.status === "passed"),
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
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {titles[status]} <span className="font-normal">({group.length})</span>
            </h2>
            <div className="space-y-1.5">
              {group.map((r) => (
                <div key={r.filingId} className={`border rounded-lg px-4 py-2.5 ${colors[status]}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{r.entityName}</span>
                      {r.strategy && <span className="text-xs opacity-60 ml-2">{r.strategy}</span>}
                      {r.score !== undefined && <span className="text-xs opacity-50 ml-2">· {r.score}</span>}
                    </div>
                    {r.contactedAt && (
                      <span className="text-xs opacity-50">
                        {new Date(r.contactedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
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

// ─── Shared helpers ───────────────────────────────────────────────────────────

function ErrorBox({ message }: { message: string }) {
  return <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{message}</div>;
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-gray-100">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="grid grid-cols-[56px_1fr_140px_160px_100px_72px] gap-3 px-4 py-3 animate-pulse">
          <div className="h-6 w-10 bg-gray-100 rounded-full" />
          <div className="space-y-1.5">
            <div className="h-3.5 bg-gray-100 rounded w-2/3" />
            <div className="h-3 bg-gray-50 rounded w-1/2" />
          </div>
          <div className="h-5 bg-gray-100 rounded-full w-20" />
          <div className="h-3.5 bg-gray-100 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-12" />
          <div className="h-3 bg-gray-100 rounded w-10" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, hint }: { icon: string; title: string; hint: string }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="font-medium text-gray-600 text-sm">{title}</p>
      <p className="text-xs mt-1">{hint}</p>
    </div>
  );
}
