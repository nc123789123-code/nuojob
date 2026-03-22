"use client";

import { SearchFilters, RaiseBucket } from "@/app/types";

interface FiltersProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  total: number;
  loading: boolean;
  onExport: () => void;
}

const BUCKET_OPTIONS: Array<{ value: RaiseBucket | "all"; label: string; color: string }> = [
  { value: "all", label: "All", color: "bg-gray-100 text-gray-700" },
  { value: "hot", label: "🔥 Hot", color: "bg-red-100 text-red-700" },
  { value: "warm", label: "Warm", color: "bg-orange-100 text-orange-700" },
  { value: "watch", label: "Watch", color: "bg-yellow-100 text-yellow-700" },
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-500" },
];

export default function Filters({
  filters,
  onChange,
  total,
  loading,
  onExport,
}: FiltersProps) {
  const update = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      {/* Top row: counts + export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Filters</h2>
          {!loading && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {total} fund{total !== 1 ? "s" : ""}
            </span>
          )}
          {loading && (
            <span className="text-xs text-gray-400 animate-pulse">Loading…</span>
          )}
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Priority bucket tabs */}
      <div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Priority
        </div>
        <div className="flex gap-2 flex-wrap">
          {BUCKET_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update("bucket", opt.value as SearchFilters["bucket"])}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filters.bucket === opt.value
                  ? `${opt.color} border-current shadow-sm`
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Strategy */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Strategy
          </label>
          <select
            value={filters.strategy}
            onChange={(e) => update("strategy", e.target.value as SearchFilters["strategy"])}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Strategies</option>
            <optgroup label="Credit / Private">
              <option value="private_credit">Private Credit</option>
              <option value="special_sits">Special Situations</option>
              <option value="direct_lending">Direct Lending</option>
              <option value="distressed">Distressed</option>
              <option value="mezzanine">Mezzanine</option>
            </optgroup>
            <optgroup label="Hedge Funds">
              <option value="hedge_fund">Hedge Fund (General)</option>
              <option value="long_short">Long/Short Equity</option>
              <option value="macro">Global Macro</option>
              <option value="quant">Quantitative</option>
              <option value="multi_strategy">Multi-Strategy</option>
            </optgroup>
          </select>
        </div>

        {/* Date Range */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Filed Within
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => update("dateRange", e.target.value as SearchFilters["dateRange"])}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
          </select>
        </div>

        {/* Min Amount */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Min. Fund Size
          </label>
          <select
            value={filters.minAmount}
            onChange={(e) => update("minAmount", e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Any size</option>
            <option value="10">$10M+</option>
            <option value="50">$50M+</option>
            <option value="100">$100M+</option>
            <option value="250">$250M+</option>
            <option value="500">$500M+</option>
            <option value="1000">$1B+</option>
          </select>
        </div>
      </div>
    </div>
  );
}
