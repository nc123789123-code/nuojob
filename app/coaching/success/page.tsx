"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const SESSION_LABELS: Record<string, string> = {
  resume: "Resume & Profile Review",
  mock: "Mock Interview",
  strategy: "Career Strategy Session",
};

function SuccessContent() {
  const params = useSearchParams();
  const type = params.get("type") || "";
  const label = SESSION_LABELS[type] || "Coaching Session";
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

  return (
    <div className="min-h-screen bg-[#14101E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Nav */}
      <div className="bg-[#14101E] border-b border-[#2A2438]">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-tight" style={{ color: "#E9C989" }}>Onlu</span>
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-16 text-center">
        <div className="w-16 h-16 bg-[#14352A] border-2 border-[#2A2438] rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[#F4F0FA] mb-2">Payment confirmed.</h1>
        <p className="text-[#9A93AC] text-sm leading-relaxed mb-8">
          Your <strong className="text-[#F4F0FA]">{label}</strong> is booked. Pick a time below and we&apos;ll see you on the call.
        </p>

        {/* Calendly embed */}
        {calendlyUrl ? (
          <div className="bg-[#14101E] rounded-2xl border border-[#2A2438] overflow-hidden shadow-sm mb-8">
            <iframe
              src={`${calendlyUrl}?hide_gdpr_banner=1&primary_color=1A2B4A`}
              width="100%"
              height="650"
              frameBorder="0"
              title="Book your session"
            />
          </div>
        ) : (
          <div className="bg-[#14101E] rounded-2xl border border-[#2A2438] px-6 py-10 mb-8">
            <p className="text-sm font-semibold text-[#F4F0FA] mb-2">A calendar link is on its way to your inbox.</p>
            <p className="text-xs text-[#8A8398]">Check your email to schedule your session. If you don&apos;t see it within a few minutes, check your spam folder.</p>
          </div>
        )}

        <div className="bg-[#14101E] rounded-xl border border-[#2A2438] p-5 text-left mb-6">
          <p className="text-xs font-bold text-[#8A8398] uppercase tracking-wide mb-3">Before the session</p>
          <ul className="space-y-2">
            {[
              "Have your CV and LinkedIn ready to share",
              "Write down your top 3 questions or blockers",
              "Note the firms and roles you are targeting",
            ].map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-[#9A93AC]">
                <span className="w-4 h-4 bg-[#7C3AED] text-white rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold mt-0.5">→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] text-white text-sm font-semibold rounded-xl hover:bg-[#171226] transition-colors">
          Back to Onlu
        </Link>
      </div>
    </div>
  );
}

export default function CoachingSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
