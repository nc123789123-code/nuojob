export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#f2f4f6] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-[#1A2B4A] flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-2xl font-black">O</span>
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
