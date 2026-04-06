"use client";

import { useState, useEffect } from "react";

interface Stats {
  subscribers: { signals: number; guide: number; total: number };
  asOf: string;
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (t: string) => {
    if (!t) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin-stats?token=${encodeURIComponent(t)}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setStats(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  };

  const submit = (e: React.FormEvent) => { e.preventDefault(); load(token); };

  return (
    <div className="min-h-screen bg-[#f8fafb] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#1A2B4A]">Onlu Admin</h1>
          <p className="text-sm text-[#71787c]">Subscriber stats</p>
        </div>

        {!stats && (
          <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#41484c] mb-1">Admin token</label>
              <input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Enter your admin token"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B4A]/20"
              />
            </div>
            {error && <p className="text-sm text-rose-500">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-[#1A2B4A] text-white text-sm font-semibold rounded-xl hover:bg-[#243d6b] transition-colors disabled:opacity-50">
              {loading ? "Loading…" : "View Stats →"}
            </button>
          </form>
        )}

        {stats && (
          <div className="space-y-4">
            {/* Total */}
            <div className="bg-[#1A2B4A] text-white rounded-2xl p-6 text-center">
              <p className="text-sm opacity-70 mb-1">Total subscribers</p>
              <p className="text-5xl font-bold">{stats.subscribers.total}</p>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                <p className="text-xs text-[#71787c] mb-1">Fund Signals</p>
                <p className="text-3xl font-bold text-[#1A2B4A]">{stats.subscribers.signals}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                <p className="text-xs text-[#71787c] mb-1">Guide</p>
                <p className="text-3xl font-bold text-[#1A2B4A]">{stats.subscribers.guide}</p>
              </div>
            </div>

            <p className="text-[11px] text-center text-[#71787c]">
              As of {new Date(stats.asOf).toLocaleString()}
            </p>

            <button onClick={() => { setStats(null); setToken(""); }}
              className="w-full text-xs text-[#71787c] hover:text-[#1A2B4A] transition-colors">
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
