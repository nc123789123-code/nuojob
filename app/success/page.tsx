import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Purchase confirmed — Onlu",
  description: "Your Credit Interview Guide purchase is confirmed.",
};

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#14101E] flex flex-col items-center justify-center px-5">
      {/* Nav strip */}
      <div className="fixed top-0 left-0 right-0 bg-slate-900 h-12 flex items-center px-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-white font-bold text-base tracking-tight">Onlu</span>
          <span className="text-[#8A8398] text-xs font-medium tracking-wide uppercase">Intel</span>
        </Link>
      </div>

      <div className="mt-12 w-full max-w-md text-center">
        {/* Checkmark */}
        <div className="w-16 h-16 bg-[#14352A] border border-[#2A2438] rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[#F4F0FA] mb-3">You're all set.</h1>
        <p className="text-[#9A93AC] text-sm leading-relaxed mb-2">
          Your <strong className="text-[#B8B0C8]">Credit Interview Guide</strong> is on its way.
          Check your inbox — you should receive access instructions within a few minutes.
        </p>
        <p className="text-[#8A8398] text-xs mb-8">
          If you don't see it, check your spam folder or reply to the confirmation email.
        </p>

        <div className="bg-[#14101E] border border-[#2A2438] rounded-xl p-5 text-left mb-6">
          <p className="text-xs font-semibold text-[#8A8398] uppercase tracking-wide mb-3">What's next</p>
          <ul className="space-y-2.5">
            {[
              "Check your email for guide access",
              "Work through the case-based examples at your own pace",
              "Use the frameworks in your next credit interview",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-[#9A93AC]">
                <span className="w-4 h-4 bg-slate-900 text-white rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold mt-0.5">→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
        >
          Back to Onlu
        </Link>
      </div>
    </div>
  );
}
