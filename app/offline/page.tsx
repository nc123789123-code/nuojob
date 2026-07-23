"use client";
import LogoMark from "@/app/components/LogoMark";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#0A0710] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-6">
          <LogoMark size={64} />
        </div>
        <h1 className="text-xl font-bold text-[#F4F0FA] mb-2">You&apos;re offline</h1>
        <p className="text-sm text-[#9A93AC] mb-6 leading-relaxed">
          Check your connection and try again. Recent data you&apos;ve viewed may still be available.
        </p>
        <button onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-xl hover:bg-[#171226] transition-colors">
          Try again
        </button>
      </div>
    </div>
  );
}
