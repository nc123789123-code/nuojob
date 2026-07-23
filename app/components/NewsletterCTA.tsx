"use client";

import { useState } from "react";

interface Props {
  intent?: "signals_subscriber" | "guide_interest";
  title?: string;
  description?: string;
  placeholder?: string;
  cta?: string;
  successMessage?: string;
  dark?: boolean;
}

export default function NewsletterCTA({
  intent = "signals_subscriber",
  title = "Hiring signals, decoded.",
  description = "Get new fund signals, relevant roles, and market insight in your inbox.",
  placeholder = "your@email.com",
  cta = "Subscribe",
  successMessage = "You're on the list.",
  dark = true,
}: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), intent }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Try again.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const bg = dark ? "bg-[#171226]" : "bg-[#201B2E] border border-[#38324E]";
  const headingColor = dark ? "text-white" : "text-[#F4F0FA]";
  const descColor = dark ? "text-white/70" : "text-[#9A93AC]";
  const labelColor = dark ? "text-white/60" : "text-[#8A8398]";
  const inputCls = dark
    ? "border-white/20 bg-[#201B2E]/10 text-white placeholder:text-white/40 focus:ring-white/60"
    : "border-[#38324E] bg-[#201B2E] text-[#F4F0FA] placeholder:text-[#8A8398] focus:ring-[#396477]";
  const btnCls = dark
    ? "bg-[#201B2E] text-[#A78BFA] hover:bg-[#201B2E]"
    : "bg-[#171226] text-white hover:bg-[#6D28D9]";

  return (
    <div className={`${bg} rounded-xl px-6 py-7 text-center`}>
      <p className={`text-[11px] font-semibold ${labelColor} uppercase tracking-widest mb-2`}>
        Bi-Weekly Intelligence
      </p>
      <h3 className={`${headingColor} font-semibold text-lg tracking-tight`}>{title}</h3>
      <p className={`${descColor} text-sm mt-1.5 max-w-sm mx-auto leading-relaxed`}>{description}</p>

      {submitted ? (
        <div className="mt-5 inline-flex items-center gap-2 bg-[#10B981]/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium px-4 py-2 rounded-lg">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          {successMessage}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 flex gap-2 max-w-sm mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            required
            className={`flex-1 rounded-lg border text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:border-transparent ${inputCls}`}
          />
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex-shrink-0 disabled:opacity-50 ${btnCls}`}
          >
            {loading ? "…" : cta}
          </button>
        </form>
      )}

      {error && (
        <p className="text-red-400 text-xs mt-2">{error}</p>
      )}

      <p className={`${dark ? "text-white/40" : "text-gray-300"} text-[11px] mt-3`}>
        No spam. Unsubscribe any time.
      </p>
    </div>
  );
}
