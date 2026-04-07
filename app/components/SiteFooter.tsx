import Link from "next/link";
import LogoMark from "@/app/components/LogoMark";

export default function SiteFooter() {
  return (
    <footer className="border-t border-[#c1c7cc]/30 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <LogoMark size={20} />
          <span className="text-[#71787c] text-xs">Onlu · Buyside intelligence</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {[
            { href: "/?tab=hiring", label: "Hiring Watch" },
            { href: "/?tab=pulse", label: "Market Pulse" },
            { href: "/?tab=firmprep", label: "Edge Prep" },
            { href: "/?tab=table", label: "Onlu Events" },
            { href: "/?tab=learn", label: "Onlu Learning" },
            { href: "/#guide", label: "Interview Guide" },
            { href: "/about", label: "About" },
            { href: "/contact", label: "Contact" },
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms" },
          ].map(({ href, label }) => (
            <Link key={label} href={href} className="text-xs text-[#71787c] hover:text-[#191c1e] transition-colors">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
