"use client";

import { useState } from "react";

export default function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  return (
    <div className="bg-slate-900 rounded-xl px-6 py-7 text-center">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Weekly Intelligence</p>
      <h3 className="text-white font-semibold text-lg tracking-tight">Hiring signals, decoded.</h3>
      <p className="text-slate-400 text-sm mt-1.5 max-w-sm mx-auto leading-relaxed">
        Every Monday: the strongest buy-side hiring signals from the past week, with context on what each one means.
      </p>

      {submitted ? (
        <div className="mt-5 inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium px-4 py-2 rounded-lg">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          You&apos;re on the list.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 flex gap-2 max-w-sm mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800 text-white text-sm px-3 py-2 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-white text-slate-900 text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            Subscribe
          </button>
        </form>
      )}
      <p className="text-slate-600 text-[11px] mt-3">No spam. Unsubscribe any time.</p>
    </div>
  );
}
