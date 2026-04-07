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
          <Link href="/?tab=hiring" className="px-3 py-1 rounded-md text-sm font-medium text-[#41484c] hover:text-[#191c1e] hover:bg-[#f2f4f6] transition-all">
            Hiring Watch
          </Link>
          <Link href="/?tab=pulse" className="px-3 py-1 rounded-md text-sm font-medium text-[#41484c] hover:text-[#191c1e] hover:bg-[#f2f4f6] transition-all">
            Market Pulse
          </Link>
          <Link href="/?tab=firmprep" className="px-3 py-1 rounded-md text-sm font-medium text-[#41484c] hover:text-[#191c1e] hover:bg-[#f2f4f6] transition-all">
            Edge Prep
          </Link>
          <Link href="/?tab=table" className="px-3 py-1 rounded-md text-sm font-medium text-[#41484c] hover:text-[#191c1e] hover:bg-[#f2f4f6] transition-all">
            Onlu Events
          </Link>
          <Link href="/?tab=learn" className="px-3 py-1 rounded-md text-sm font-medium text-[#41484c] hover:text-[#191c1e] hover:bg-[#f2f4f6] transition-all">
            Onlu Learning
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/about" className="hidden sm:inline text-[#41484c] hover:text-[#191c1e] text-xs transition-colors">About</Link>
          <Link href="/contact" className="hidden sm:inline text-[#41484c] hover:text-[#191c1e] text-xs transition-colors">Contact</Link>
          <span className="text-[#71787c] text-xs hidden md:block">Buyside intelligence</span>
        </div>
      </div>
    </header>
  );
}
