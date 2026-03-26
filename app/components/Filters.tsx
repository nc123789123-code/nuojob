"use client";

import { SearchFilters, RaiseBucket } from "@/app/types";

interface FiltersProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  total: number;
  loading: boolean;
  onExport: () => void;
}

const BUCKETS: Array<{ v: RaiseBucket | "all"; l: string }> = [
  { v: "all",   l: "All" },
  { v: "hot",   l: "🔥 Hot" },
  { v: "warm",  l: "Warm" },
  { v: "watch", l: "Watch" },
  { v: "low",   l: "Low" },
];

export default function FundFilterBar({ filters, onChange, total, loading, onExport }: FiltersProps) {
  const set = <K extends keyof SearchFilters>(k: K, v: SearchFilters[K]) => onChange({ ...filters, [k]: v });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Bucket pills */}
      {BUCKETS.map((b) => (
        <button
          key={b.v}
          onClick={() => set("bucket", b.v as SearchFilters["bucket"])}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            filters.bucket === b.v
              ? "bg-[#396477] text-white border-[#396477]"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
          }`}
        >
          {b.l}
        </button>
      ))}

      <div className="w-px h-5 bg-gray-200 hidden sm:block" />

      {/* Strategy */}
      <select
        value={filters.strategy}
        onChange={(e) => set("strategy", e.target.value as SearchFilters["strategy"])}
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#396477]"
      >
        <option value="all">All strategies</option>
        <optgroup label="Credit / Private">
          <option value="private_credit">Private Credit</option>
          <option value="special_sits">Special Situations</option>
          <option value="direct_lending">Direct Lending</option>
          <option value="distressed">Distressed</option>
          <option value="mezzanine">Mezzanine</option>
        </optgroup>
        <optgroup label="Hedge Funds">
          <option value="hedge_fund">Hedge Fund</option>
          <option value="long_short">Long/Short Equity</option>
          <option value="macro">Global Macro</option>
          <option value="quant">Quantitative</option>
          <option value="multi_strategy">Multi-Strategy</option>
        </optgroup>
      </select>

      {/* Date */}
      <select
        value={filters.dateRange}
        onChange={(e) => set("dateRange", e.target.value as SearchFilters["dateRange"])}
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#396477]"
      >
        <option value="30">Last 30d</option>
        <option value="60">Last 60d</option>
        <option value="90">Last 90d</option>
        <option value="180">Last 6mo</option>
      </select>

      {/* Min size */}
      <select
        value={filters.minAmount}
        onChange={(e) => set("minAmount", e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#396477]"
      >
        <option value="">Any size</option>
        <option value="10">$10M+</option>
        <option value="50">$50M+</option>
        <option value="100">$100M+</option>
        <option value="250">$250M+</option>
        <option value="500">$500M+</option>
        <option value="1000">$1B+</option>
      </select>

      {/* Result count + export */}
      <span className="ml-auto text-xs text-gray-400">
        {loading ? "Searching…" : `${total} fund${total !== 1 ? "s" : ""}`}
      </span>
      <button
        onClick={onExport}
        className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:border-gray-400 hover:text-gray-700 transition-all bg-white"
      >
        Export CSV
      </button>
    </div>
  );
}
