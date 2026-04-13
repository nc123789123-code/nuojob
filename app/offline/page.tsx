import LogoMark from "@/app/components/LogoMark";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#f2f4f6] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-6">
          <LogoMark size={64} />
        </div>
        <h1 className="text-xl font-bold text-[#191c1e] mb-2">You&apos;re offline</h1>
        <p className="text-sm text-[#71787c] mb-6 leading-relaxed">
          Check your connection and try again. Recent data you&apos;ve viewed may still be available.
        </p>
        <button onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-[#1A2B4A] text-white text-sm font-bold rounded-xl hover:bg-[#396477] transition-colors">
          Try again
        </button>
      </div>
    </div>
  );
}
