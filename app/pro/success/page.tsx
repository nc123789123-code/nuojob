import Link from "next/link";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";

export const metadata = {
  title: "Welcome to Onlu Pro",
  robots: { index: false, follow: false },
};

export default function ProSuccessPage() {
  return (
    <div className="min-h-screen bg-[#0A0710] flex flex-col" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <SiteNav />
      <section className="flex-1 flex items-center justify-center px-5 py-20">
        <div className="max-w-md w-full bg-[#14101E] border border-[#2A2438] rounded-2xl p-10 text-center shadow-[0_8px_32px_rgba(57,100,119,0.08)]">
          <div className="w-14 h-14 rounded-full bg-[#14352A] border border-[#2A2438] flex items-center justify-center mx-auto mb-5 text-2xl">
            ✓
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F4F0FA] mb-3">You&apos;re a Pro member.</h1>
          <p className="text-sm text-[#B8B0C8] leading-relaxed mb-6">
            Thanks for supporting Onlu. Check your inbox for a welcome email — your full digest,
            real-time signals, and unlimited prep are unlocking now. Reply to that email anytime
            if you need a hand.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-lg bg-[#7C3AED] text-white text-sm font-bold hover:bg-[#5d9a7e] transition-colors"
          >
            Go to the platform →
          </Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
