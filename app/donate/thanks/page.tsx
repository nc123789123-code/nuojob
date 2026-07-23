import Link from "next/link";

export default function DonateThanksPage() {
  return (
    <div className="min-h-screen bg-[#14101E] flex flex-col items-center justify-center px-5" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <div className="w-16 h-16 bg-[#2E1620] border-2 border-[#2A2438] rounded-full flex items-center justify-center mx-auto mb-6">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-rose-400">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-[#F4F0FA] mb-2">Thank you.</h1>
      <p className="text-sm text-[#9A93AC] text-center max-w-xs leading-relaxed mb-8">
        Your contribution helps keep Onlu free and independent. We genuinely appreciate it.
      </p>
      <Link href="/" className="px-5 py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-xl hover:bg-[#171226] transition-colors">
        Back to Onlu →
      </Link>
    </div>
  );
}
