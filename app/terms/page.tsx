import type { Metadata } from "next";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";

export const metadata: Metadata = {
  title: "Terms of Service — Onlu",
  description: "Terms of Service for Onlu, the buyside intelligence platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
      <SiteNav />
      <main className="flex-1 max-w-2xl mx-auto px-5 py-14 w-full">
        <p className="text-[11px] font-semibold text-[#71787c] uppercase tracking-widest mb-3">Legal</p>
        <h1 className="text-[#191c1e] text-2xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-xs text-[#71787c] mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-sm text-[#41484c] leading-relaxed">

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using Onlu ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service. We may update these terms from time to time; continued use of the Service after changes constitutes acceptance of the revised terms.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">2. Description of Service</h2>
            <p>Onlu is an information platform that aggregates and presents publicly available data related to buyside hiring signals, SEC EDGAR fund filings, job listings, and financial market information. The Service also includes AI-generated content, educational resources, and interview preparation materials.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">3. Eligibility</h2>
            <p>You must be at least 18 years old to use the Service. By using Onlu, you represent that you meet this requirement and that all information you provide is accurate.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">4. Permitted Use</h2>
            <p className="mb-2">You may use the Service for personal, non-commercial career research and informational purposes. You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Reproduce, scrape, redistribute, or commercialise any content or data from the platform without prior written permission</li>
              <li>Use the Service to build a competing product or service</li>
              <li>Attempt to reverse-engineer, disassemble, or extract source code from the Service</li>
              <li>Use automated tools, bots, or scripts to access or scrape the Service</li>
              <li>Share, resell, or transfer access to paid products to any third party</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">5. Paid Products</h2>
            <p>Certain products (including the interview guide) are available for purchase. All sales are final unless otherwise required by applicable law. Access is granted to the individual purchaser only and may not be shared, resold, or transferred. We reserve the right to change pricing at any time; changes will not affect completed purchases.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">6. No Investment Advice</h2>
            <p>All content on Onlu — including fund signals, market data, hiring intelligence, and AI-generated analysis — is provided for informational purposes only and does not constitute investment advice, financial advice, or a recommendation to buy or sell any security. Always consult a qualified financial professional before making investment decisions.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">7. Data Accuracy</h2>
            <p>Onlu aggregates data from third-party sources including SEC EDGAR, public job boards, and external APIs. We make no representations or warranties about the completeness, accuracy, or timeliness of this data. Use all information at your own discretion.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">8. Intellectual Property</h2>
            <p>All original content, design, software, and compilation of data on Onlu is the property of Onlu and protected by applicable intellectual property laws. Third-party data (e.g., SEC filings, job listings) remains the property of its respective owners.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">9. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the Service will be uninterrupted, error-free, or free of harmful components. Your use of the Service is at your sole risk.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">10. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, Onlu and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service, even if advised of the possibility of such damages. Our total liability shall not exceed the amount you paid us in the twelve months prior to the claim.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">11. Termination</h2>
            <p>We reserve the right to suspend or terminate your access to the Service at any time, with or without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">12. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of the United States. Any disputes shall be resolved in the competent courts of the applicable jurisdiction.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">13. Contact</h2>
            <p>For questions about these Terms, contact us at{" "}
              <a href="mailto:info@onluintel.com" className="text-[#396477] hover:underline">info@onluintel.com</a>.
            </p>
          </section>

        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
