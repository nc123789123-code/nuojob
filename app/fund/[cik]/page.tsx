"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormDFiling {
  accessionNumber: string;
  filingDate: string;
  form: string;
}

interface FormDDetails {
  totalOfferingAmount?: string;
  totalAmountSold?: string;
  minimumInvestment?: string;
  dateOfFirstSale?: string;
  revenueRange?: string;
  investmentFundType?: string;
}

interface FirmData {
  cik: string;
  name: string;
  sic?: string;
  sicDescription?: string;
  stateOfIncorporation?: string;
  formDFilings: FormDFiling[];
  formDDetails: FormDDetails | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(raw?: string): string {
  const n = parseFloat(raw || "0");
  if (!n) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function agoLabel(dateStr: string): string {
  const d = daysSince(dateStr);
  if (d === 0) return "Today";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.round(d / 7)}w ago`;
  if (d < 365) return `${Math.round(d / 30)}mo ago`;
  return `${Math.round(d / 365)}y ago`;
}

function inferStrategy(name: string, investmentFundType?: string): string {
  const n = (name + " " + (investmentFundType || "")).toLowerCase();
  if (/private credit|direct lending|lending fund/i.test(n)) return "Private Credit";
  if (/distressed|special sit|special opportunities/i.test(n)) return "Special Situations";
  if (/long.?short|l\/s equity|equity hedge/i.test(n)) return "Long/Short Equity";
  if (/private equity|buyout|lbo/i.test(n)) return "Private Equity";
  if (/venture|early.?stage|seed/i.test(n)) return "Venture Capital";
  if (/quant|systematic|algorithmic/i.test(n)) return "Quantitative";
  if (/macro|global macro/i.test(n)) return "Global Macro";
  if (/real estate|reit|property/i.test(n)) return "Real Estate";
  if (/hedge fund|fund of fund/i.test(n)) return "Hedge Fund";
  if (/credit/i.test(n)) return "Credit";
  if (/equity/i.test(n)) return "Equity";
  return "Alternative Asset Manager";
}

function generateBrief(data: FirmData): { whatTheyDo: string; whatTheyHireFor: string; hiringReality: string; whoShouldTarget: string } {
  const strategy = inferStrategy(data.name, data.formDDetails?.investmentFundType ?? "");
  const filingCount = data.formDFilings.length;
  const latestFiling = data.formDFilings[0];
  const offered = fmt(data.formDDetails?.totalOfferingAmount);
  const sold = fmt(data.formDDetails?.totalAmountSold);
  const minInvest = fmt(data.formDDetails?.minimumInvestment);

  const whatTheyDo = (() => {
    if (strategy.includes("Credit") || strategy.includes("Lending")) {
      return `${data.name} operates as a ${strategy.toLowerCase()} manager, raising capital through private placement structures. Their activity in the SEC Form D database indicates active fundraising — typically associated with a defined fund lifecycle of origination, deployment, and harvest.`;
    }
    if (strategy.includes("Private Equity") || strategy.includes("Buyout")) {
      return `${data.name} is a private equity manager with documented Form D fundraising activity. PE firms at this stage are typically mid-fund-cycle — either actively deploying capital or preparing for a follow-on vehicle.`;
    }
    if (strategy.includes("Hedge") || strategy.includes("Long") || strategy.includes("Macro") || strategy.includes("Quant")) {
      return `${data.name} operates as a ${strategy.toLowerCase()} fund. Their SEC filing history suggests an active fund structure with ongoing capital activity. Most funds of this type maintain a core investment team plus dedicated IR and operations functions.`;
    }
    return `${data.name} is an alternative asset manager with documented SEC Form D fundraising activity. Their filing history provides a window into fund structure and capital-raise timing.`;
  })();

  const whatTheyHireFor = (() => {
    if (strategy.includes("Credit") || strategy.includes("Lending")) {
      return "Credit analysts and associates (deal origination, underwriting, monitoring), capital formation or IR professionals, and fund operations. Senior credit roles (VP/MD) appear during scale-up phases following a major fund close.";
    }
    if (strategy.includes("Private Equity")) {
      return "Investment associates and VPs focused on deal execution, sector-specific analysts, and operational roles (finance, portfolio ops). GP-level hires are rare and typically occur pre-launch.";
    }
    if (strategy.includes("Quant") || strategy.includes("Systematic")) {
      return "Quantitative researchers and portfolio managers (signal generation, backtesting), data engineers, and risk/technology roles. Hiring tends to cluster around strategy launches and AUM thresholds.";
    }
    return "Investment professionals (analysts, associates, PMs), investor relations and capital formation, and fund operations. Team composition varies significantly by strategy and fund size.";
  })();

  const hiringReality = (() => {
    const recentFiling = latestFiling ? daysSince(latestFiling.filingDate) <= 90 : false;
    const sizePart = offered !== "—" ? ` with a ${offered} offering` : "";

    if (recentFiling) {
      return `${data.name} has a very recent Form D filing${sizePart}. This is typically within 15 days of a capital commitment, making it a strong forward-looking hiring signal. Firms at this stage are actively building out teams.`;
    }
    if (filingCount >= 3) {
      return `${data.name} shows ${filingCount} Form D filings in EDGAR, indicating an established fund-raising cadence. Serial filers are typically stable operations with recurring team-building needs between fund closes.`;
    }
    return `${data.name} has filed ${filingCount === 1 ? "a Form D" : `${filingCount} Form Ds`}${sizePart}. Capital activity at this level correlates with hiring across investment, IR, and operational roles.`;
  })();

  const whoShouldTarget = (() => {
    if (strategy.includes("Credit") || strategy.includes("Lending")) {
      return "Credit-track professionals from leveraged finance, direct lending, or structured products with 2–5 years of deal exposure. IB analysts targeting a buyside transition should prioritize credit shops actively raising — timing is everything.";
    }
    if (strategy.includes("Private Equity")) {
      return "IB analysts (2–3 years) targeting buyside transition, or VP-level hires from other PE shops. PE funds are highly specific on sector and deal-size fit — tailor your approach to their fund mandate.";
    }
    if (strategy.includes("Hedge") || strategy.includes("Equity")) {
      return "Equity research analysts (sell-side or buyside), fundamental equity investors with coverage depth, or PMs looking to spin out or join an emerging manager. Research quality is the primary filter.";
    }
    return "Finance professionals with 2–6 years of relevant experience targeting a buyside move. Entry without industry context is rare — prior exposure to the strategy is typically expected.";
  })();

  return { whatTheyDo, whatTheyHireFor, hiringReality, whoShouldTarget };
}

// ─── Pill ────────────────────────────────────────────────────────────────────

function Pill({ label, cls = "bg-gray-50 text-gray-600 border-gray-200" }: { label: string; cls?: string }) {
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function BriefSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pt-5 first:pt-0">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</h3>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FirmDetailPage({ params }: { params: { cik: string } }) {
  const { cik } = params;
  const [data, setData] = useState<FirmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/fund/${cik}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [cik]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-5 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-100 rounded w-1/4" />
            <div className="h-40 bg-white border border-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-5 py-12 text-center">
          <p className="text-gray-500 text-sm">{error || "Fund not found"}</p>
          <Link href="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">← Back</Link>
        </div>
      </div>
    );
  }

  const strategy = inferStrategy(data.name, data.formDDetails?.investmentFundType ?? "");
  const brief = generateBrief(data);
  const latestFiling = data.formDFilings[0];
  const offered = fmt(data.formDDetails?.totalOfferingAmount);
  const sold = fmt(data.formDDetails?.totalAmountSold);
  const isRecent = latestFiling ? daysSince(latestFiling.filingDate) <= 90 : false;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-4xl mx-auto px-5 py-8 space-y-6">
        {/* Top section */}
        <div>
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">{data.name}</h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Pill label={strategy} cls="bg-indigo-50 text-indigo-700 border-indigo-200" />
                {data.stateOfIncorporation && <Pill label={data.stateOfIncorporation} />}
                {isRecent && (
                  <Pill label="Active signal" cls="bg-emerald-50 text-emerald-700 border-emerald-200" />
                )}
                {offered !== "—" && <Pill label={offered} cls="bg-gray-50 text-gray-600 border-gray-200" />}
              </div>
            </div>
            <Link
              href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=D&dateb=&owner=include&count=40`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0 mt-1"
            >
              SEC EDGAR ↗
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Intelligence Brief */}
          <div className="lg:col-span-2 space-y-4">
            {/* Brief panel */}
            <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 divide-y divide-gray-100">
              <BriefSection label="What This Firm Actually Does">
                <p className="text-sm text-gray-700 leading-relaxed">{brief.whatTheyDo}</p>
              </BriefSection>

              <BriefSection label="What They Hire For">
                <p className="text-sm text-gray-700 leading-relaxed">{brief.whatTheyHireFor}</p>
              </BriefSection>

              <BriefSection label="Hiring Reality">
                <p className="text-sm text-gray-700 leading-relaxed">{brief.hiringReality}</p>
              </BriefSection>

              <BriefSection label="Who Should Target This Firm">
                <p className="text-sm text-gray-700 leading-relaxed">{brief.whoShouldTarget}</p>
              </BriefSection>
            </div>

            {/* Capital activity timeline */}
            {data.formDFilings.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl px-6 py-5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Capital Activity (Form D)</h3>
                <div className="space-y-2">
                  {data.formDFilings.slice(0, 8).map((f) => (
                    <div key={f.accessionNumber} className="flex items-center justify-between gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${f.form === "D" ? "bg-blue-500" : "bg-amber-400"}`} />
                        <span className="text-gray-600">{f.form === "D" ? "New filing" : "Amendment"}</span>
                      </div>
                      <span className="text-gray-400 tabular-nums text-xs">
                        {new Date(f.filingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {" · "}
                        {agoLabel(f.filingDate)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Data sidebar */}
          <div className="space-y-4">
            {/* Fund stats */}
            <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fund Data</h3>

              {offered !== "—" && (
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">Target / Offering Size</p>
                  <p className="text-sm font-semibold text-gray-900">{offered}</p>
                </div>
              )}
              {sold !== "—" && (
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">Amount Raised</p>
                  <p className="text-sm font-semibold text-gray-900">{sold}</p>
                </div>
              )}
              {data.formDDetails?.minimumInvestment && fmt(data.formDDetails.minimumInvestment) !== "—" && (
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">Min. Investment</p>
                  <p className="text-sm font-semibold text-gray-900">{fmt(data.formDDetails.minimumInvestment)}</p>
                </div>
              )}
              {data.formDDetails?.dateOfFirstSale && (
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">First Sale Date</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(data.formDDetails.dateOfFirstSale).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </p>
                </div>
              )}
              {latestFiling && (
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">Latest Filing</p>
                  <p className="text-sm font-semibold text-gray-900">{agoLabel(latestFiling.filingDate)}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] text-gray-400 mb-0.5">Form D Count</p>
                <p className="text-sm font-semibold text-gray-900">{data.formDFilings.length}</p>
              </div>
            </div>

            {/* Find roles CTA */}
            <div className="bg-slate-900 rounded-xl px-5 py-4">
              <p className="text-white text-sm font-semibold mb-1">Find open roles</p>
              <p className="text-slate-400 text-xs leading-relaxed mb-3">Browse live and inferred hiring signals from this fund and similar firms.</p>
              <Link
                href={`/?tab=jobs`}
                className="inline-flex items-center gap-1.5 bg-white text-slate-900 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                View all signals →
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          Data sourced from{" "}
          <a
            href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=D`}
            target="_blank" rel="noopener noreferrer"
            className="underline"
          >
            SEC EDGAR Form D
          </a>
          {" "}· Intelligence layer by OnluIntel · Not investment advice
        </p>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="bg-slate-900 sticky top-0 z-20">
      <div className="max-w-4xl mx-auto px-5 h-12 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-white font-bold text-base tracking-tight">Onlu</span>
          <span className="text-slate-400 text-xs font-medium tracking-wide uppercase">Intel</span>
        </Link>
        <div className="w-px h-4 bg-slate-700" />
        <span className="text-slate-400 text-xs">Firm Intelligence</span>
      </div>
    </header>
  );
}
