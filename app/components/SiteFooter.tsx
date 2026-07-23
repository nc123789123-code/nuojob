import Link from "next/link";
import LogoMark from "@/app/components/LogoMark";

export default function SiteFooter() {
  return (
    <footer className="border-t border-[#38324E]/30 bg-[#201B2E] mt-auto">
      <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <LogoMark size={20} />
          <span className="text-[#9A93AC] text-xs">Onlu · Finance intelligence</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {[
            { href: "/?tab=hiring", label: "Hiring Watch" },
            { href: "/?tab=pulse", label: "Market Pulse" },
            { href: "/?tab=firmprep", label: "Edge Prep" },
            { href: "/?tab=table", label: "Onlu Events" },
            { href: "/?tab=learn", label: "Onlu Learning" },
            { href: "/coaching", label: "Coaching" },
            { href: "/pricing", label: "Pricing" },
            { href: "/universities", label: "Universities" },
            { href: "/about", label: "About" },
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms" },
            { href: "https://docs.google.com/forms/d/e/1FAIpQLSdy46uVtoHN2cwGicCqeGEbJCiU0yK-oRM66I8vdGnl_orObw/viewform?usp=publish-editor", label: "Share Feedback" },
          ].map(({ href, label }) => (
            <Link key={label} href={href} className="text-xs text-[#9A93AC] hover:text-[#F4F0FA] transition-colors">
              {label}
            </Link>
          ))}
          <Link href="/donate" className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-[#FB7185] font-semibold transition-colors">
            <svg viewBox="0 0 14 14" fill="currentColor" className="w-3 h-3">
              <path d="M12.07 2.55a3.5 3.5 0 0 0-4.95 0L7 2.67l-.12-.12a3.5 3.5 0 0 0-4.95 4.95l.12.12L7 12.67l4.95-4.95.12-.12a3.5 3.5 0 0 0 0-4.95z"/>
            </svg>
            Support Onlu
          </Link>
        </nav>
      </div>
    </footer>
  );
}
