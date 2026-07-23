import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";

export const metadata: Metadata = {
  title: "US Residential Construction: Caught Between a Deficit and a Hard Place — Onlu",
  description:
    "The US needs millions more homes. Tariffs, labor shortages, and affordability constraints are making it harder to build them. A data-driven look at the market's deepening paradox.",
};

export default function HousingConstructionPost() {
  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <SiteNav />

      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-3xl mx-auto px-5 h-10 flex items-center gap-2 text-xs text-gray-400">
          <Link href="/?tab=learn" className="hover:text-[#396477] transition-colors">Onlu Learning</Link>
          <span>›</span>
          <span className="text-gray-600 truncate">US Residential Construction</span>
        </div>
      </div>

      <main className="flex-1 w-full">
        <iframe
          src="/housing-construction-2026.html"
          className="w-full border-0"
          style={{ minHeight: "calc(100vh - 120px)" }}
          title="US Residential Construction: Caught Between a Deficit and a Hard Place"
        />
      </main>

      <SiteFooter />
    </div>
  );
}
