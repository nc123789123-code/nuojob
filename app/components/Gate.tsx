"use client";

import { useEffect, useState } from "react";

type Level = "email" | "pro";

interface Props {
  level: Level;
  children: React.ReactNode;
  title?: string;
  description?: string;
}

/**
 * Wrap any premium content in <Gate>. Anonymous users see the content blurred
 * behind an unlock card:
 *   level="email" — asks for an email address (free), then reveals.
 *   level="pro"   — asks for email; if that email has an active Pro sub it
 *                   reveals, otherwise it offers the upgrade.
 */
export default function Gate({ level, children, title, description }: Props) {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [pro, setPro] = useState(false);

  const [inputEmail, setInputEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [needsUpgrade, setNeedsUpgrade] = useState(false);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((d) => {
        setEmail(d.email);
        setPro(d.pro);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasAccess = level === "pro" ? pro : !!email;

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!inputEmail.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inputEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setSubmitting(false);
        return;
      }
      setEmail(data.email);
      setPro(data.pro);
      if (level === "pro" && !data.pro) {
        setNeedsUpgrade(true); // email captured, but not Pro yet
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function goPro() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/pro-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "monthly", email: email || inputEmail || undefined }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else {
        setError(data.error || "Something went wrong.");
        setSubmitting(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (hasAccess || loading) {
    // While loading we optimistically render children to avoid a flash; the
    // server never sends gated data to the client here, so this is just UI.
    return <>{children}</>;
  }

  const heading =
    title || (level === "pro" ? "Unlock this with Onlu Pro" : "See the full signals");
  const sub =
    description ||
    (level === "pro"
      ? "Real-time signals and the full feed are part of Onlu Pro — $5/mo, cancel anytime."
      : "Enter your email to unlock this week's detailed hiring and capital signals. Free.");

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Blurred preview of the real content */}
      <div className="pointer-events-none select-none blur-sm opacity-60 max-h-72 overflow-hidden" aria-hidden="true">
        {children}
      </div>

      {/* Unlock card */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px] p-5">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-[#c1c7cc]/50 shadow-[0_8px_32px_rgba(57,100,119,0.12)] p-6 text-center">
          <div className="w-11 h-11 rounded-full bg-[#f5f3ff] border border-violet-200 flex items-center justify-center mx-auto mb-3 text-lg">
            {level === "pro" ? "⭐" : "🔓"}
          </div>
          <h3 className="text-base font-bold text-[#1A2B4A] mb-1.5">{heading}</h3>
          <p className="text-xs text-[#41484c] leading-relaxed mb-4">{sub}</p>

          {needsUpgrade ? (
            <>
              <button
                onClick={goPro}
                disabled={submitting}
                className="w-full px-4 py-2.5 rounded-lg bg-[#6aab8e] text-white text-sm font-bold hover:bg-[#5d9a7e] transition-colors disabled:opacity-50"
              >
                {submitting ? "Redirecting…" : "Go Pro — $5/mo"}
              </button>
              <p className="text-[11px] text-[#71787c] mt-2">
                Already subscribed with a different email?{" "}
                <button onClick={() => setNeedsUpgrade(false)} className="text-[#396477] font-semibold hover:underline">
                  Try another
                </button>
              </p>
            </>
          ) : (
            <form onSubmit={unlock} className="flex flex-col gap-2">
              <input
                type="email"
                required
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full rounded-lg border border-[#c1c7cc]/60 bg-[#f8fafb] text-sm px-3 py-2.5 text-[#191c1e] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6aab8e] focus:border-transparent"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2.5 rounded-lg bg-[#1A2B4A] text-white text-sm font-bold hover:bg-[#243b63] transition-colors disabled:opacity-50"
              >
                {submitting ? "Unlocking…" : level === "pro" ? "Continue" : "Unlock — it's free"}
              </button>
            </form>
          )}

          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <p className="text-[10px] text-gray-400 mt-3">No spam. Unsubscribe anytime.</p>
        </div>
      </div>
    </div>
  );
}
