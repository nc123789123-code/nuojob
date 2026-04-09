import Link from "next/link";

export default function DonateThanksPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col items-center justify-center px-5" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <div className="w-16 h-16 bg-rose-50 border-2 border-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-rose-400">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-[#191c1e] mb-2">Thank you.</h1>
      <p className="text-sm text-gray-500 text-center max-w-xs leading-relaxed mb-8">
        Your contribution helps keep Onlu free and independent. We genuinely appreciate it.
      </p>
      <Link href="/" className="px-5 py-2.5 bg-[#1A2B4A] text-white text-sm font-bold rounded-xl hover:bg-[#152238] transition-colors">
        Back to Onlu →
      </Link>
    </div>
  );
}
