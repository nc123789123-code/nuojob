"use client";

import { useState } from "react";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent("OnluIntel — Contact");
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`
    );
    window.location.href = `mailto:info@onluintel.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
      <SiteNav />

      <main className="flex-1 max-w-xl mx-auto px-5 py-14 w-full">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold text-[#71787c] uppercase tracking-widest mb-3">Contact</p>
          <h1 className="text-[#191c1e] text-2xl sm:text-3xl font-bold tracking-tight leading-snug mb-4">
            Get in touch
          </h1>
          <p className="text-[#41484c] text-sm leading-relaxed">
            If you have feedback, ideas, partnership interest, or product suggestions, feel free to reach out.
          </p>
        </div>

        {/* What we'd love to hear */}
        <div className="mb-8">
          <p className="text-[#41484c] text-sm mb-3">We&apos;d especially love to hear from you on:</p>
          <ul className="space-y-1.5 pl-1">
            {[
              "product feedback",
              "fund or hiring signals we should track",
              "data quality suggestions",
              "partnerships or collaborations",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-[#41484c]">
                <span className="text-[#396477] font-bold mt-0.5 flex-shrink-0">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Direct email */}
        <div className="mb-8 p-4 bg-white border border-[#c1c7cc]/40 rounded-xl">
          <p className="text-xs text-[#71787c] mb-1">Email directly</p>
          <a
            href="mailto:info@onluintel.com"
            className="text-sm font-medium text-[#396477] hover:text-[#2d5162] hover:underline transition-colors"
          >
            info@onluintel.com
          </a>
        </div>

        {/* Contact form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#41484c] mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full text-sm border border-[#c1c7cc] rounded-lg px-3 py-2.5 bg-white text-[#191c1e] placeholder:text-[#71787c] focus:outline-none focus:ring-2 focus:ring-[#396477] focus:border-transparent transition-shadow"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#41484c] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full text-sm border border-[#c1c7cc] rounded-lg px-3 py-2.5 bg-white text-[#191c1e] placeholder:text-[#71787c] focus:outline-none focus:ring-2 focus:ring-[#396477] focus:border-transparent transition-shadow"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#41484c] mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your message…"
              required
              rows={5}
              className="w-full text-sm border border-[#c1c7cc] rounded-lg px-3 py-2.5 bg-white text-[#191c1e] placeholder:text-[#71787c] focus:outline-none focus:ring-2 focus:ring-[#396477] focus:border-transparent resize-none transition-shadow"
            />
          </div>
          <button
            type="submit"
            className="w-full px-5 py-3 bg-[#396477] text-white text-sm font-semibold rounded-lg hover:bg-[#2d5162] transition-colors"
          >
            Send Message
          </button>
          <p className="text-[11px] text-[#71787c] text-center">
            This will open your email client with the message pre-filled.
          </p>
        </form>
      </main>

      <SiteFooter />
    </div>
  );
}
