import Link from "next/link";
import LogoMark from "@/app/components/LogoMark";

export default function SiteNav() {
  return (
    <header className="glass-panel sticky top-0 z-20 border-b border-[#2A2438]/30 shadow-[0_1px_8px_rgba(57,100,119,0.06)]">
      <div className="max-w-6xl mx-auto px-8 h-24 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3">
          <LogoMark size={46} />
          <span className="font-semibold text-lg tracking-tight" style={{ color: "#E9C989" }}>Onlu</span>
        </Link>
        <div className="w-px h-4 bg-[#c1c7cc]/50" />
        <nav className="flex items-center gap-1">
          <Link href="/?tab=hiring" className="px-3 py-1 rounded-md text-sm font-medium text-[#B8B0C8] hover:text-[#F4F0FA] hover:bg-[#0A0710] transition-all">
            Hiring Watch
          </Link>
          <Link href="/?tab=pulse" className="px-3 py-1 rounded-md text-sm font-medium text-[#B8B0C8] hover:text-[#F4F0FA] hover:bg-[#0A0710] transition-all">
            Market Pulse
          </Link>
          <Link href="/?tab=firmprep" className="px-3 py-1 rounded-md text-sm font-medium text-[#B8B0C8] hover:text-[#F4F0FA] hover:bg-[#0A0710] transition-all">
            Edge Prep
          </Link>
          <Link href="/?tab=table" className="px-3 py-1 rounded-md text-sm font-medium text-[#B8B0C8] hover:text-[#F4F0FA] hover:bg-[#0A0710] transition-all">
            Onlu Events
          </Link>
          <Link href="/?tab=learn" className="px-3 py-1 rounded-md text-sm font-medium text-[#B8B0C8] hover:text-[#F4F0FA] hover:bg-[#0A0710] transition-all">
            Onlu Learning
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <span className="hidden sm:inline text-[10px] font-semibold text-[#5EE6B5] bg-[#14352A] border border-[#2A2438] px-2 py-0.5 rounded-full tracking-wide">Free · No login</span>
          <Link href="/about" className="hidden sm:inline text-[#B8B0C8] hover:text-[#F4F0FA] text-xs transition-colors">About</Link>
          <Link href="/contact" className="hidden sm:inline text-[#B8B0C8] hover:text-[#F4F0FA] text-xs transition-colors">Contact</Link>
          <a href="https://docs.google.com/forms/d/e/1FAIpQLSdy46uVtoHN2cwGicCqeGEbJCiU0yK-oRM66I8vdGnl_orObw/viewform?usp=publish-editor" target="_blank" rel="noopener noreferrer" className="hidden sm:inline text-[10px] font-semibold text-[#A78BFA] hover:text-[#F4F0FA] border border-[#396477]/30 px-2 py-0.5 rounded-full transition-colors">Give feedback</a>
          <span className="text-[#9A93AC] text-xs hidden md:block">Finance intelligence</span>
        </div>
      </div>
    </header>
  );
}
