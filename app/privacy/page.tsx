import type { Metadata } from "next";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy Policy — OnluIntel",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
      <SiteNav />
      <main className="flex-1 max-w-2xl mx-auto px-5 py-14 w-full">
        <p className="text-[11px] font-semibold text-[#71787c] uppercase tracking-widest mb-3">Legal</p>
        <h1 className="text-[#191c1e] text-2xl font-bold tracking-tight mb-6">Privacy Policy</h1>
        <div className="space-y-4 text-sm text-[#41484c] leading-relaxed">
          <p>
            OnluIntel collects only the information necessary to provide the service, including email addresses submitted voluntarily for newsletter signup or product access.
          </p>
          <p>
            We do not sell, trade, or share your personal information with third parties except as required to operate the service (e.g., payment processing via Stripe, email delivery).
          </p>
          <p>
            All fund and hiring signal data displayed on OnluIntel is sourced from publicly available records including SEC EDGAR filings and public job boards.
          </p>
          <p>
            For questions about data or privacy, contact us at{" "}
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
