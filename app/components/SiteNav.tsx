import Link from "next/link";
import LogoMark from "@/app/components/LogoMark";

export default function SiteNav() {
  return (
    <header className="glass-panel sticky top-0 z-20 border-b border-[#c1c7cc]/30 shadow-[0_1px_8px_rgba(57,100,119,0.06)]">
      <div className="max-w-6xl mx-auto px-8 h-24 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3">
          <LogoMark size={46} />
          <span className="font-semibold text-lg tracking-tight" style={{ color: "#6aab8e" }}>Onlu</span>
        </Link>
        <div className="w-px h-4 bg-[#c1c7cc]/50" />
        <nav className="flex items-center gap-1">
          <Link href="/" className="px-3 py-1 rounded-md text-sm font-medium text-[#41484c] hover:text-[#191c1e] hover:bg-[#f2f4f6] transition-all">
            Fund Signals
          </Link>
          <Link href="/#guide" className="px-3 py-1 rounded-md text-sm font-medium text-[#41484c] hover:text-[#191c1e] hover:bg-[#f2f4f6] transition-all">
            Interview Guide
          </Link>
          <Link href="/?tab=career" className="px-3 py-1 rounded-md text-sm font-medium text-[#41484c] hover:text-[#191c1e] hover:bg-[#f2f4f6] transition-all">
            Career Prep
          </Link>
          <Link href="/?tab=insights" className="px-3 py-1 rounded-md text-sm font-medium text-[#41484c] hover:text-[#191c1e] hover:bg-[#f2f4f6] transition-all">
            Insights
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/about" className="hidden sm:inline text-[#41484c] hover:text-[#191c1e] text-xs transition-colors">About</Link>
          <Link href="/contact" className="hidden sm:inline text-[#41484c] hover:text-[#191c1e] text-xs transition-colors">Contact</Link>
          <span className="text-[#71787c] text-xs hidden md:block">Private credit &amp; special situations</span>
        </div>
      </div>
    </header>
  );
}
