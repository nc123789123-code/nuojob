import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-[#c1c7cc]/30 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#396477] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-[10px] leading-none">O</span>
          </div>
          <span className="text-[#71787c] text-xs">Onlu · Private credit &amp; special situations intelligence</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {[
            { href: "/", label: "Fund Signals" },
            { href: "/?tab=insights", label: "Insights" },
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
