"use client";
import Link from "next/link";
import { useState } from "react";

const PRESETS = [
  { amount: 500,  label: "$5" },
  { amount: 1000, label: "$10" },
  { amount: 2500, label: "$25" },
  { amount: 5000, label: "$50" },
];

export default function DonatePage() {
  const [selected, setSelected] = useState<number>(1000);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const effectiveAmount = custom
    ? Math.round(parseFloat(custom) * 100)
    : selected;

  async function donate() {
    if (!effectiveAmount || effectiveAmount < 100) {
      setError("Minimum donation is $1.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/donation-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: effectiveAmount }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Something went wrong.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb]" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Nav */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center gap-3">
          <Link href="/" className="font-extrabold text-xl tracking-tight" style={{ color: "#6aab8e" }}>Onlu</Link>
          <div className="w-px h-4 bg-gray-200" />
          <span className="text-xs font-bold text-[#396477] uppercase tracking-widest">Support</span>
          <Link href="/" className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition-colors">← Platform</Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-16 text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-rose-50 border-2 border-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-rose-400" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[#191c1e] mb-3">Keep Onlu free.</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-10 max-w-sm mx-auto">
          Onlu is built by a small team and kept free on purpose. If it&apos;s helped your search,
          a small contribution goes a long way toward keeping the lights on.
        </p>

        {/* Amount selector */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-left space-y-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Choose an amount</p>

          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map(p => (
              <button key={p.amount}
                onClick={() => { setSelected(p.amount); setCustom(""); }}
                className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                  selected === p.amount && !custom
                    ? "border-[#396477] bg-[#396477]/8 text-[#396477]"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Or enter a custom amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-semibold">$</span>
              <input
                type="number"
                min="1"
                step="1"
                value={custom}
                onChange={e => { setCustom(e.target.value); setSelected(0); }}
                placeholder="e.g. 15"
                className="w-full text-sm border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#396477]/20 focus:border-[#396477]"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button onClick={donate} disabled={loading}
            className="w-full py-3 bg-[#1A2B4A] text-white text-sm font-bold rounded-xl hover:bg-[#152238] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</>
              : <>
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 opacity-80">
                    <path d="M13.89 3.39a4 4 0 0 0-5.66 0L8 3.62l-.23-.23a4 4 0 0 0-5.66 5.66l.23.23L8 14.94l5.66-5.66.23-.23a4 4 0 0 0 0-5.66z"/>
                  </svg>
                  Contribute {custom ? `$${parseFloat(custom || "0").toFixed(0)}` : PRESETS.find(p => p.amount === selected)?.label ?? ""}
                </>
            }
          </button>

          <p className="text-[11px] text-gray-400 text-center">
            Secure checkout via Stripe · No account needed · One-time payment
          </p>
        </div>

        {/* What it goes toward */}
        <div className="mt-8 bg-white border border-gray-100 rounded-xl p-5 text-left">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">What your support funds</p>
          <ul className="space-y-2">
            {[
              "Hosting, infrastructure, and API costs",
              "New features and data sources",
              "Keeping the platform free for everyone",
            ].map(item => (
              <li key={item} className="flex items-start gap-2 text-xs text-gray-600">
                <svg className="w-3.5 h-3.5 text-[#6aab8e] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5L13 5" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
