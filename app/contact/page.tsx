"use client";

import { useState } from "react";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("sent");
      setName(""); setEmail(""); setMessage("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#201B2E] flex flex-col">
      <SiteNav />

      <main className="flex-1 max-w-xl mx-auto px-5 py-14 w-full">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold text-[#9A93AC] uppercase tracking-widest mb-3">Contact</p>
          <h1 className="text-[#F4F0FA] text-2xl sm:text-3xl font-bold tracking-tight leading-snug mb-4">
            Get in touch
          </h1>
          <p className="text-[#B8B0C8] text-sm leading-relaxed">
            If you have feedback, ideas, partnership interest, or product suggestions, feel free to reach out.
          </p>
        </div>

        {/* What we'd love to hear */}
        <div className="mb-8">
          <p className="text-[#B8B0C8] text-sm mb-3">We&apos;d especially love to hear from you on:</p>
          <ul className="space-y-1.5 pl-1">
            {[
              "product feedback",
              "fund or hiring signals we should track",
              "data quality suggestions",
              "partnerships or collaborations",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-[#B8B0C8]">
                <span className="text-[#A78BFA] font-bold mt-0.5 flex-shrink-0">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Direct email */}
        <div className="mb-8 p-4 bg-[#201B2E] border border-[#38324E]/40 rounded-xl">
          <p className="text-xs text-[#9A93AC] mb-1">Email directly</p>
          <a
            href="mailto:info@onluintel.com"
            className="text-sm font-medium text-[#A78BFA] hover:text-[#2d5162] hover:underline transition-colors"
          >
            info@onluintel.com
          </a>
        </div>

        {/* Contact form */}
        {status === "sent" ? (
          <div className="bg-[#14352A]/40 border border-[#a8cfbc]/50 rounded-xl px-5 py-6 text-center">
            <p className="text-[#5EE6B5] font-semibold text-sm mb-1">Message sent.</p>
            <p className="text-[#B8B0C8] text-xs">We&apos;ll get back to you at {email || "your email"}.</p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-4 text-xs text-[#A78BFA] hover:underline"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#B8B0C8] mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full text-sm border border-[#38324E] rounded-lg px-3 py-2.5 bg-[#201B2E] text-[#F4F0FA] placeholder:text-[#9A93AC] focus:outline-none focus:ring-2 focus:ring-[#396477] focus:border-transparent transition-shadow"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#B8B0C8] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full text-sm border border-[#38324E] rounded-lg px-3 py-2.5 bg-[#201B2E] text-[#F4F0FA] placeholder:text-[#9A93AC] focus:outline-none focus:ring-2 focus:ring-[#396477] focus:border-transparent transition-shadow"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#B8B0C8] mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your message…"
                required
                rows={5}
                className="w-full text-sm border border-[#38324E] rounded-lg px-3 py-2.5 bg-[#201B2E] text-[#F4F0FA] placeholder:text-[#9A93AC] focus:outline-none focus:ring-2 focus:ring-[#396477] focus:border-transparent resize-none transition-shadow"
              />
            </div>
            {status === "error" && (
              <p className="text-xs text-[#FB7185]">{errorMsg}</p>
            )}
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full px-5 py-3 bg-[#171226] text-white text-sm font-semibold rounded-lg hover:bg-[#6D28D9] transition-colors disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Send Message"}
            </button>
          </form>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
