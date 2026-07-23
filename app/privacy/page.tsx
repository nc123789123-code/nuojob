import type { Metadata } from "next";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy Policy — Onlu",
  description: "Privacy Policy for Onlu, the buyside intelligence platform.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
      <SiteNav />
      <main className="flex-1 max-w-2xl mx-auto px-5 py-14 w-full">
        <p className="text-[11px] font-semibold text-[#71787c] uppercase tracking-widest mb-3">Legal</p>
        <h1 className="text-[#191c1e] text-2xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-xs text-[#71787c] mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-sm text-[#41484c] leading-relaxed">

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">1. Overview</h2>
            <p>Onlu ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and your rights with respect to that information. By using the Service, you agree to the practices described in this policy.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">2. Information We Collect</h2>
            <p className="mb-2">We collect only what is necessary to provide the Service:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-medium text-[#191c1e]">Email address</span> — when you subscribe to our newsletter, sign up for alerts, or register for Onlu Table events</li>
              <li><span className="font-medium text-[#191c1e]">Payment information</span> — when you purchase a product (processed by Stripe; we do not store card details)</li>
              <li><span className="font-medium text-[#191c1e]">Usage data</span> — basic analytics such as page views and feature interactions, collected in aggregate and not linked to your identity</li>
              <li><span className="font-medium text-[#191c1e]">Communications</span> — if you contact us via email or the contact form, we retain that correspondence</li>
            </ul>
            <p className="mt-2">We do not require account registration to use the core Service. We do not collect your name, address, phone number, or any government-issued identifier.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To send newsletters, hiring signal updates, and product announcements (email subscribers only)</li>
              <li>To process and fulfil product purchases</li>
              <li>To respond to enquiries and provide support</li>
              <li>To improve the Service based on aggregate usage patterns</li>
              <li>To comply with legal obligations</li>
            </ul>
            <p className="mt-2">We will never sell, rent, or trade your personal information to third parties for marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">4. Third-Party Services</h2>
            <p className="mb-2">We use the following third-party services to operate the platform:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-medium text-[#191c1e]">Stripe</span> — payment processing. Governed by <a href="https://stripe.com/privacy" className="text-[#396477] hover:underline" target="_blank" rel="noopener noreferrer">Stripe's Privacy Policy</a></li>
              <li><span className="font-medium text-[#191c1e]">Resend</span> — transactional and newsletter email delivery</li>
              <li><span className="font-medium text-[#191c1e]">Vercel</span> — hosting and infrastructure</li>
              <li><span className="font-medium text-[#191c1e]">Anthropic</span> — AI-generated content (firm prep guides, concept answers, market snapshots). User search queries are sent to Anthropic's API; no account data or email is included</li>
              <li><span className="font-medium text-[#191c1e]">RapidAPI / external data providers</span> — job listing and market data aggregation (no personal data shared)</li>
            </ul>
            <p className="mt-2">These providers have their own privacy policies and security practices. We share only the minimum data necessary for each service to function.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">5. Cookies and Local Storage</h2>
            <p>Onlu uses browser local storage to save your preferences (such as filter settings and outreach tracking) entirely on your device. We do not use tracking cookies or third-party advertising cookies. We may use minimal first-party cookies for session management.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">6. Data Retention</h2>
            <p>We retain your email address for as long as you remain subscribed. You may unsubscribe at any time using the link in any email we send. Purchase records are retained as required for accounting and legal purposes (typically 7 years). We delete other personal data upon request.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">7. Your Rights</h2>
            <p className="mb-2">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Withdraw consent to email communications at any time</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, contact us at <a href="mailto:info@onluintel.com" className="text-[#396477] hover:underline">info@onluintel.com</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">8. Data Security</h2>
            <p>We implement reasonable technical and organisational measures to protect your information. However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security and encourage you to use strong, unique passwords and to contact us immediately if you suspect unauthorised access.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">9. Children's Privacy</h2>
            <p>The Service is not directed at children under 18. We do not knowingly collect personal information from minors. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date above. Material changes will be communicated via email to subscribers or via a notice on the site.</p>
          </section>

          <section>
            <h2 className="text-[#191c1e] font-semibold text-base mb-2">11. Contact</h2>
            <p>For any privacy-related questions or requests, contact us at{" "}
              <a href="mailto:info@onluintel.com" className="text-[#396477] hover:underline">info@onluintel.com</a>.
            </p>
          </section>

        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
