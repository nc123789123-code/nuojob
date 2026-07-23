import type { Metadata } from "next";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";

export const metadata: Metadata = { title: "Unsubscribe — Onlu" };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e: encoded } = await searchParams;

  let status: "success" | "error" | "missing" = "missing";

  if (encoded) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_URL || "https://onluintel.com";
      const res = await fetch(`${baseUrl}/api/unsubscribe?e=${encoded}`, { cache: "no-store" });
      status = res.ok ? "success" : "error";
    } catch {
      status = "error";
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
      <SiteNav />
      <main className="flex-1 flex items-center justify-center px-5 py-20">
        <div className="max-w-md text-center">
          {status === "success" && (
            <>
              <p className="text-2xl mb-3">✓</p>
              <h1 className="text-[#191c1e] text-xl font-bold mb-3">You've been unsubscribed.</h1>
              <p className="text-[#41484c] text-sm leading-relaxed">
                You won't receive further emails from Onlu. If this was a mistake,
                you can re-subscribe any time from the homepage.
              </p>
            </>
          )}
          {status === "error" && (
            <>
              <h1 className="text-[#191c1e] text-xl font-bold mb-3">Something went wrong.</h1>
              <p className="text-[#41484c] text-sm leading-relaxed">
                We couldn't process your unsubscribe request. Please email{" "}
                <a href="mailto:info@onluintel.com" className="text-[#396477] hover:underline">
                  info@onluintel.com
                </a>{" "}
                and we'll remove you manually.
              </p>
            </>
          )}
          {status === "missing" && (
            <>
              <h1 className="text-[#191c1e] text-xl font-bold mb-3">Invalid link.</h1>
              <p className="text-[#41484c] text-sm leading-relaxed">
                This unsubscribe link is invalid. Please email{" "}
                <a href="mailto:info@onluintel.com" className="text-[#396477] hover:underline">
                  info@onluintel.com
                </a>{" "}
                to be removed.
              </p>
            </>
          )}
          <a href="/" className="inline-block mt-8 text-xs text-[#71787c] hover:text-[#191c1e] transition-colors">
            ← Back to Onlu
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
