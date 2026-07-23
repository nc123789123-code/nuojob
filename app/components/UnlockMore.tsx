"use client";

import { useState } from "react";

interface Props {
  hasAccess: boolean;
  label: string;          // e.g. "Show all 42 firms"
  expandedLabel: string;  // e.g. "Show less"
  expanded: boolean;
  onToggle: () => void;   // called when an entitled user toggles
  onUnlocked: () => void; // called after a fresh email unlock
}

/**
 * A "show more" control that gates expansion behind an email. Entitled users
 * get the normal toggle; everyone else gets a one-field email unlock.
 */
export default function UnlockMore({ hasAccess, label, expandedLabel, expanded, onToggle, onUnlocked }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const btn =
    "mt-3 w-full py-2.5 text-xs font-semibold text-[#A78BFA] border border-[#396477]/30 rounded-xl hover:bg-[#171226]/5 transition-colors";

  if (hasAccess) {
    return (
      <button onClick={onToggle} className={btn}>
        {expanded ? expandedLabel : label}
      </button>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={btn}>
        🔓 {label} — free with your email
      </button>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setSubmitting(false);
        return;
      }
      onUnlocked();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col sm:flex-row gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="flex-1 rounded-xl border border-[#38324E]/60 bg-[#201B2E] text-xs px-3 py-2.5 text-[#F4F0FA] placeholder:text-[#8A8398] focus:outline-none focus:ring-2 focus:ring-[#6aab8e] focus:border-transparent"
      />
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2.5 rounded-xl bg-[#7C3AED] text-white text-xs font-bold hover:bg-[#243b63] transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {submitting ? "Unlocking…" : "Unlock — free"}
      </button>
      {error && <p className="text-red-500 text-xs self-center">{error}</p>}
    </form>
  );
}
