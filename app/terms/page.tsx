import type { Metadata } from "next";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";

export const metadata: Metadata = {
  title: "Terms of Use — Onlu",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
      <SiteNav />
      <main className="flex-1 max-w-2xl mx-auto px-5 py-14 w-full">
        <p className="text-[11px] font-semibold text-[#71787c] uppercase tracking-widest mb-3">Legal</p>
        <h1 className="text-[#191c1e] text-2xl font-bold tracking-tight mb-6">Terms of Use</h1>
        <div className="space-y-4 text-sm text-[#41484c] leading-relaxed">
          <p>
            Onlu is provided for informational purposes only. Fund signals, hiring intel, and market data displayed on the platform are derived from publicly available sources and are not intended as investment advice.
          </p>
          <p>
            By using Onlu, you agree not to reproduce, redistribute, or commercialise any content or data from the platform without prior written permission.
          </p>
          <p>
            Paid products (including the interview guide) are for personal use only. Access is granted to the individual purchaser and may not be shared or resold.
          </p>
          <p>
            Onlu makes no representations about the completeness or accuracy of third-party data sourced from SEC EDGAR or external job boards. Use at your own discretion.
          </p>
          <p>
            For questions, contact{" "}
            <a href="mailto:info@onluintel.com" className="text-[#396477] hover:underline">
              info@onluintel.com
            </a>
            .
          </p>
          <p className="text-[#71787c] text-xs pt-4">Last updated: 2026</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
