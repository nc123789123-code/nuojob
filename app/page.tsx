"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import SearchBar from "@/app/components/SearchBar";
import Filters from "@/app/components/Filters";
import FundCard from "@/app/components/FundCard";
import StartupCard from "@/app/components/StartupCard";
import StartupFilters from "@/app/components/StartupFilters";
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
    } catch {
      // ignore
    }
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

  // Funds state
  const [fundFilters, setFundFilters] = useState<SearchFilters>(DEFAULT_FUND_FILTERS);
  const [fundFilings, setFundFilings] = useState<FundFiling[]>([]);
  const [fundTotal, setFundTotal] = useState(0);
  const [fundLoading, setFundLoading] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);
  const [fundSubTab, setFundSubTab] = useState<"search" | "outreach">("search");

  // Startups state
  const [startupFilters, setStartupFilters] = useState<StartupSearchFilters>(DEFAULT_STARTUP_FILTERS);
  const [startupFilings, setStartupFilings] = useState<StartupFiling[]>([]);
  const [startupTotal, setStartupTotal] = useState(0);
  const [startupLoading, setStartupLoading] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);

  const { records, updateRecord } = useOutreachTracker();
  const fundDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startupDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch funds ────────────────────────────────────────────────────────────
  const fetchFunds = useCallback(async (f: SearchFilters) => {
    setFundLoading(true);
    setFundError(null);
    try {
      const params = new URLSearchParams({
        query: f.query, strategy: f.strategy,
        dateRange: f.dateRange, bucket: f.bucket, minAmount: f.minAmount,
      });
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

  useEffect(() => {
    if (topTab !== "funds") return;
    if (fundDebounceRef.current) clearTimeout(fundDebounceRef.current);
    fundDebounceRef.current = setTimeout(() => fetchFunds(fundFilters), 500);
    return () => { if (fundDebounceRef.current) clearTimeout(fundDebounceRef.current); };
  }, [fundFilters, fetchFunds, topTab]);

  // ── Fetch startups ─────────────────────────────────────────────────────────
  const fetchStartups = useCallback(async (f: StartupSearchFilters) => {
    setStartupLoading(true);
    setStartupError(null);
    try {
      const params = new URLSearchParams({
        query: f.query, stage: f.stage,
        dateRange: f.dateRange, bucket: f.bucket, minAmount: f.minAmount,
      });
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
    if (topTab !== "startups") return;
    if (startupDebounceRef.current) clearTimeout(startupDebounceRef.current);
    startupDebounceRef.current = setTimeout(() => fetchStartups(startupFilters), 500);
    return () => { if (startupDebounceRef.current) clearTimeout(startupDebounceRef.current); };
  }, [startupFilters, fetchStartups, topTab]);

  // Trigger initial load when switching tabs
  useEffect(() => {
    if (topTab === "funds" && fundFilings.length === 0 && !fundLoading) {
      fetchFunds(fundFilters);
    }
    if (topTab === "startups" && startupFilings.length === 0 && !startupLoading) {
      fetchStartups(startupFilters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topTab]);

  const outreachFunds = Object.values(records).filter((r) => r.status !== "not_contacted");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-6 h-14">
            {/* Brand */}
            <span className="font-bold text-gray-900 text-base tracking-tight flex-shrink-0">Nolo</span>

            {/* Nav tabs */}
            <nav className="flex items-center gap-1">
              <NavTab
                active={topTab === "funds"}
                onClick={() => setTopTab("funds")}
                label="Funds"
                badge={outreachFunds.filter((r) => r.strategy && r.strategy !== "Seed" && r.strategy !== "Series A" && r.strategy !== "Series B").length || 0}
              />
              <NavTab
                active={topTab === "startups"}
                onClick={() => setTopTab("startups")}
                label="Startups"
                badge={0}
              />
            </nav>

            {/* Context subtitle */}
            <p className="ml-auto text-xs text-gray-400 hidden sm:block">
              {topTab === "funds"
                ? "Capital & Hiring Signals · SEC Form D"
                : "Funding & Hiring Signals · SEC Form D"}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {topTab === "funds" ? (
          <FundsTab
            filters={fundFilters}
            setFilters={setFundFilters}
            filings={fundFilings}
            total={fundTotal}
            loading={fundLoading}
            error={fundError}
            records={records}
            updateRecord={updateRecord}
            outreachFunds={outreachFunds}
            subTab={fundSubTab}
            setSubTab={setFundSubTab}
            onExport={() => exportToCsv(fundFilings, records)}
          />
        ) : (
          <StartupsTab
            filters={startupFilters}
            setFilters={setStartupFilters}
            filings={startupFilings}
            total={startupTotal}
            loading={startupLoading}
            error={startupError}
            records={records}
            updateRecord={updateRecord}
          />
        )}
      </main>
    </div>
  );
}

// ─── Nav tab ──────────────────────────────────────────────────────────────────

function NavTab({ active, onClick, label, badge }: {
  active: boolean; onClick: () => void; label: string; badge: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? "bg-gray-900 text-white"
          : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
      }`}
    >
      {label}
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Funds tab ────────────────────────────────────────────────────────────────

function FundsTab({
  filters, setFilters, filings, total, loading, error,
  records, updateRecord, outreachFunds, subTab, setSubTab, onExport,
}: {
  filters: SearchFilters;
  setFilters: (f: SearchFilters) => void;
  filings: FundFiling[];
  total: number;
  loading: boolean;
  error: string | null;
  records: Record<string, OutreachRecord>;
  updateRecord: (r: OutreachRecord) => void;
  outreachFunds: OutreachRecord[];
  subTab: "search" | "outreach";
  setSubTab: (t: "search" | "outreach") => void;
  onExport: () => void;
}) {
  return (
    <>
      {/* Page title + sub-tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Funds</h2>
          <p className="text-xs text-gray-500 mt-0.5">Precision signals · Form D filings · IR &amp; investing hires</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setSubTab("search")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              subTab === "search" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Search
          </button>
          <button
            onClick={() => setSubTab("outreach")}
            className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              subTab === "outreach" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Pipeline
            {outreachFunds.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {outreachFunds.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {subTab === "search" ? (
        <>
          <SearchBar
            value={filters.query}
            onChange={(q) => setFilters({ ...filters, query: q })}
            loading={loading}
          />
          <Filters
            filters={filters}
            onChange={setFilters}
            total={total}
            loading={loading}
            onExport={onExport}
          />
          <FundBanner />
          {error && <ErrorBox message={error} />}
          {loading && filings.length === 0 && <LoadingSkeleton />}
          {!loading && filings.length === 0 && !error && (
            <EmptyState icon="📋" title="No funds found" hint="Try broadening the date range or changing the strategy filter" />
          )}
          <div className="space-y-3">
            {filings.map((filing) => (
              <FundCard
                key={filing.id}
                filing={filing}
                outreach={records[filing.id]}
                onOutreachChange={updateRecord}
              />
            ))}
          </div>
          {filings.length > 0 && (
            <p className="text-center text-xs text-gray-400 py-4">
              Data from{" "}
              <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=D" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
                SEC EDGAR Form D
              </a>{" "}
              · Hiring signals coming in Phase 2
            </p>
          )}
        </>
      ) : (
        <OutreachPipeline records={outreachFunds} onSearchClick={() => setSubTab("search")} />
      )}
    </>
  );
}

// ─── Startups tab ─────────────────────────────────────────────────────────────

function StartupsTab({
  filters, setFilters, filings, total, loading, error, records, updateRecord,
}: {
  filters: StartupSearchFilters;
  setFilters: (f: StartupSearchFilters) => void;
  filings: StartupFiling[];
  total: number;
  loading: boolean;
  error: string | null;
  records: Record<string, OutreachRecord>;
  updateRecord: (r: OutreachRecord) => void;
}) {
  return (
    <>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Startups</h2>
        <p className="text-xs text-gray-500 mt-0.5">Funding velocity · Equity raises · Hiring surges</p>
      </div>

      <SearchBar
        value={filters.query}
        onChange={(q) => setFilters({ ...filters, query: q })}
        loading={loading}
        placeholder='Search startups — "Series B", "fintech", "healthtech"…'
        quickSearches={["Series A", "Series B", "seed round", "fintech", "healthtech", "SaaS", "AI", "climate tech"]}
      />

      <StartupFilters
        filters={filters}
        onChange={setFilters}
        total={total}
        loading={loading}
      />

      {error && <ErrorBox message={error} />}
      {loading && filings.length === 0 && <LoadingSkeleton />}
      {!loading && filings.length === 0 && !error && (
        <EmptyState icon="🚀" title="No startups found" hint="Try broadening the date range or searching a specific stage or sector" />
      )}

      <div className="space-y-2">
        {filings.map((filing) => (
          <StartupCard
            key={filing.id}
            filing={filing}
            outreach={records[filing.id]}
            onOutreachChange={updateRecord}
          />
        ))}
      </div>

      {filings.length > 0 && (
        <p className="text-center text-xs text-gray-400 py-4">
          Data from{" "}
          <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=D" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
            SEC EDGAR Form D
          </a>{" "}
          · Stage inferred from raise size · Hiring signals in Phase 2
        </p>
      )}
    </>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function FundBanner() {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => { setDismissed(localStorage.getItem("fund-banner-dismissed") === "true"); }, []);
  if (dismissed) return null;
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-3">
      <div className="flex-1">
        <p className="font-semibold mb-1">How fund scores work</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          Scores (0–100): <strong>45%</strong> fundraising (Form D recency, offering status, size) · <strong>35%</strong> hiring signals <span className="opacity-60">(Phase 2)</span> · <strong>20%</strong> expansion signals <span className="opacity-60">(Phase 2)</span>. Recency decays: 1.0× within 30d → 0.1× after 1 year. Hot = 80+, Warm = 60–79, Watch = 40–59.
        </p>
      </div>
      <button
        onClick={() => { localStorage.setItem("fund-banner-dismissed", "true"); setDismissed(true); }}
        className="text-blue-400 hover:text-blue-600 flex-shrink-0"
      >✕</button>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
      {message}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, hint }: { icon: string; title: string; hint: string }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="font-medium text-gray-600">{title}</p>
      <p className="text-sm mt-1">{hint}</p>
    </div>
  );
}

function OutreachPipeline({
  records, onSearchClick,
}: {
  records: OutreachRecord[];
  onSearchClick: () => void;
}) {
  if (records.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">📬</div>
        <p className="font-medium text-gray-600">No outreach tracked yet</p>
        <p className="text-sm mt-1">Open a fund card and set its status to start tracking</p>
        <button
          onClick={onSearchClick}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
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

  const colorMap = {
    in_discussion: "text-green-700 bg-green-50 border-green-200",
    reached_out: "text-blue-700 bg-blue-50 border-blue-200",
    passed: "text-gray-600 bg-gray-50 border-gray-200",
  } as const;

  const titles = {
    in_discussion: "In Discussion",
    reached_out: "Reached Out",
    passed: "Passed",
  } as const;

  return (
    <div className="space-y-6">
      {(["in_discussion", "reached_out", "passed"] as const).map((status) => {
        const group = groups[status];
        if (group.length === 0) return null;
        return (
          <div key={status}>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              {titles[status]}{" "}
              <span className="text-gray-400 font-normal">({group.length})</span>
            </h2>
            <div className="space-y-2">
              {group.map((record) => (
                <div key={record.filingId} className={`border rounded-xl px-4 py-3 ${colorMap[status]}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{record.entityName}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {record.strategy && <span className="text-xs opacity-70">{record.strategy}</span>}
                        {record.score !== undefined && <span className="text-xs opacity-60">Score: {record.score}</span>}
                        {record.contactedAt && (
                          <span className="text-xs opacity-60">
                            · {new Date(record.contactedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                      {record.notes && <p className="text-xs italic mt-1.5 opacity-80">{record.notes}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
