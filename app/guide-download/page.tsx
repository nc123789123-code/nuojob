/**
 * /guide-download — Post-purchase guide access page
 *
 * Linked from the purchase confirmation email sent by the Stripe webhook.
 * To gate this behind a token, add a signed URL with an expiry to the email link
 * and verify it here. For now it's open-access (the obscure URL + email gating
 * is the primary friction layer).
 *
 * To swap in a real PDF: upload to Vercel Blob / S3 and redirect to a signed URL.
 */

import Link from "next/link";
import LogoMark from "@/app/components/LogoMark";

export const metadata = {
  title: "Credit Interview Guide — Onlu",
  description: "Your private credit and special situations interview guide.",
  robots: { index: false, follow: false },
};

const SECTIONS = [
  {
    title: "1. Think Like a Credit Investor",
    content: [
      "Every credit interview question is really asking: \"Can you identify risk, size it, and price it?\" Lead with downside protection, not upside.",
      "The four questions that matter in every deal: (1) Can the borrower service the debt? (2) What happens if it can't? (3) What is the recovery? (4) Is the spread adequate compensation for that risk?",
      "Memorising technicals is necessary but not sufficient. Interviewers at Ares, KKR Credit, Owl Rock, etc. want candidates who can walk through a credit thesis, not just recite EBITDA definitions.",
    ],
  },
  {
    title: "2. Core Technical Concepts",
    subsections: [
      {
        heading: "Capital Structure",
        points: [
          "Priority waterfall: Senior Secured → Senior Unsecured → Subordinated → Equity",
          "First-lien vs second-lien: know the recovery rate difference (average ~70% vs ~20% historically)",
          "Covenant types: maintenance (tested quarterly regardless of action) vs incurrence (tested on trigger events)",
        ],
      },
      {
        heading: "Credit Metrics",
        points: [
          "Leverage: Total Debt / EBITDA. Know what \"turns\" means and typical thresholds by sector",
          "Interest coverage: EBITDA / Interest Expense. Sub-2x is a yellow flag; sub-1x is a red flag",
          "Free cash flow conversion: (EBITDA – Capex – ΔWC – Cash Taxes) / EBITDA",
          "LTV in real estate credit: Loan / Property Value — private credit analog to leverage ratio",
        ],
      },
      {
        heading: "Distressed Concepts",
        points: [
          "Par vs distressed investing: par investors underwrite to maturity; distressed investors underwrite to recovery",
          "Chapter 11 basics: automatic stay, DIP financing (super-priority), plan of reorganization, absolute priority rule",
          "MOIC vs IRR tradeoff in distressed: quick in-court restructurings favor IRR, slow out-of-court processes may deliver better MOIC",
        ],
      },
    ],
  },
  {
    title: "3. Case Study Framework",
    content: [
      "Structure every case the same way — interviewers will notice if you skip steps.",
    ],
    steps: [
      { label: "Business Quality", detail: "Competitive moat, customer concentration, contract duration, revenue visibility" },
      { label: "Financial Profile", detail: "Revenue trend, EBITDA margins, FCF conversion, debt maturity schedule" },
      { label: "Leverage & Coverage", detail: "Current leverage, peak leverage under stress, EBITDA haircut until covenant breach" },
      { label: "Downside Scenario", detail: "What causes distress? Revenue decline, margin compression, rate spike? Quantify it." },
      { label: "Recovery Analysis", detail: "Collateral value, EBITDA at distressed levels × sector EV/EBITDA, priority in waterfall" },
      { label: "Entry / Pricing", detail: "Is the yield adequate? Compare to comparable credits, spread vs treasuries, OID impact" },
      { label: "Thesis Summary", detail: "One sentence: \"We are being paid X for Y risk with Z downside protection\"" },
    ],
  },
  {
    title: "4. Practice Case: Retail Operator (Private Credit)",
    content: [
      "A mid-market sporting goods retailer is seeking a $200M first-lien term loan at L+600 (6% floor). Trailing EBITDA is $45M; management projects $52M next year. The company has $30M in existing subordinated notes.",
    ],
    questions: [
      "What is current total leverage? (Answer: ($200M + $30M) / $45M = 5.1× — high for retail)",
      "What is the interest coverage assuming 1M SOFR of 5.3%? (Answer: $45M / ($200M × 11.3% + $30M × ~14%) = $45M / $26.8M = 1.7×)",
      "What EBITDA decline can you absorb before a 5× maintenance covenant breach? (Answer: $230M × 5× = $1.15B debt is fixed; EBITDA floor = $46M — you're already at risk)",
      "What is your recovery in distress? Assume 5× EV/EBITDA at $35M distressed EBITDA. EV = $175M. First-lien recovery = $175M / $200M = 87.5%. Subordinated notes: 0.",
      "Would you invest? Frame your answer: \"At 5.1× leverage in a sector with secular headwinds and only 1.7× coverage, the risk/reward requires either a tighter covenant package or a lower entry price — I'd pass unless pricing improves 150bps or management equity is subordinated further.\"",
    ],
  },
  {
    title: "5. Common Interview Questions (with answer frameworks)",
    qas: [
      {
        q: "Walk me through how you'd evaluate a direct lending opportunity.",
        a: "Business quality → leverage & coverage → downside scenarios → recovery → pricing. Always anchor to: is the spread adequate for the risk?",
      },
      {
        q: "What's the difference between a covenant-lite and a covenant-heavy loan?",
        a: "Cov-lite has no maintenance covenants; incurrence only. Cov-heavy includes quarterly maintenance tests (leverage, coverage). Cov-lite gives borrowers more runway before technical default — worse for lenders in a slow-moving deterioration.",
      },
      {
        q: "How do you value a distressed credit?",
        a: "DCF on recovery cash flows, comparable EV/EBITDA for asset coverage, trading comps of distressed peers. Always stress the numerator (EBITDA) and denominator (multiple) simultaneously.",
      },
      {
        q: "What credit metrics matter most?",
        a: "Context-dependent. In direct lending: leverage + FCF conversion. In distressed: recovery + liquidity runway. In structured credit: attachment point + loss given default.",
      },
      {
        q: "Tell me about a credit idea you've been following.",
        a: "Pick a real, publicly traded bond or loan (e.g. from Bloomberg or 9fin). Structure it: sector overview → credit profile → thesis → risk → entry point. Avoid vague answers.",
      },
    ],
  },
  {
    title: "6. Networking & Offer Strategy",
    content: [
      "Most credit roles at Tier 1 funds (Ares, Apollo, Blackstone Credit) are sourced through 2nd-degree networks, not job boards. Use the Fund Signals tab on Onlu to identify firms that just raised — they are most likely to add headcount in the next 90 days.",
      "Target the analyst and associate layer, not just MDs. Junior team members influence hiring and often screen candidates informally before an official process starts.",
      "In outreach, lead with genuine interest in the firm's strategy. Reference a recent deal they did, a portfolio company, or their investment thesis. Generic LinkedIn messages have sub-5% response rates.",
      "In interviews, always know your numbers. If you mention a deal, know the leverage, the yield, the sector. \"I'd have to look it up\" is disqualifying for a credit role.",
    ],
  },
];

export default function GuideDownloadPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <header className="bg-white border-b border-[#c1c7cc]/30 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={32} />
            <span className="font-semibold text-base" style={{ color: "#6aab8e" }}>Onlu</span>
          </Link>
          <span className="text-xs text-[#71787c]">Credit Interview Guide</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Title block */}
        <div className="mb-10">
          <div className="inline-block px-2 py-0.5 bg-[#6aab8e]/10 text-[#6aab8e] text-xs font-medium rounded mb-3">
            Purchase confirmed
          </div>
          <h1 className="text-2xl font-bold text-[#191c1e] mb-2">
            Credit Interview Guide
          </h1>
          <p className="text-[#41484c] text-sm leading-relaxed">
            Private credit · Special situations · Distressed debt<br />
            Case-based frameworks for buy-side interviews.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title} className="bg-white rounded-xl border border-[#c1c7cc]/30 p-6">
              <h2 className="text-base font-bold text-[#191c1e] mb-4">{section.title}</h2>

              {section.content && (
                <div className="space-y-3 mb-4">
                  {section.content.map((para, i) => (
                    <p key={i} className="text-sm text-[#41484c] leading-relaxed">{para}</p>
                  ))}
                </div>
              )}

              {section.subsections?.map((sub) => (
                <div key={sub.heading} className="mb-4">
                  <h3 className="text-sm font-semibold text-[#191c1e] mb-2">{sub.heading}</h3>
                  <ul className="space-y-1.5">
                    {sub.points.map((pt, i) => (
                      <li key={i} className="flex gap-2 text-sm text-[#41484c]">
                        <span className="text-[#6aab8e] mt-0.5 flex-shrink-0">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {section.steps && (
                <ol className="space-y-3">
                  {section.steps.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#6aab8e]/10 text-[#6aab8e] text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <div>
                        <span className="text-sm font-semibold text-[#191c1e]">{step.label}: </span>
                        <span className="text-sm text-[#41484c]">{step.detail}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {section.questions && (
                <ul className="space-y-2.5">
                  {section.questions.map((q, i) => (
                    <li key={i} className="text-sm text-[#41484c] bg-[#f8f9fa] rounded-lg p-3 leading-relaxed">
                      {q}
                    </li>
                  ))}
                </ul>
              )}

              {section.qas && (
                <div className="space-y-4">
                  {section.qas.map((qa, i) => (
                    <div key={i} className="border-l-2 border-[#6aab8e]/40 pl-4">
                      <p className="text-sm font-semibold text-[#191c1e] mb-1">Q: {qa.q}</p>
                      <p className="text-sm text-[#41484c] leading-relaxed">A: {qa.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-10 p-6 bg-[#0f172a] rounded-xl text-center">
          <p className="text-white font-semibold mb-1">Ready to find your role?</p>
          <p className="text-slate-400 text-sm mb-4">
            Use Onlu's Fund Signals to identify firms actively hiring after a raise.
          </p>
          <Link
            href="/?tab=intel"
            className="inline-block px-5 py-2.5 bg-[#6aab8e] text-white text-sm font-semibold rounded-lg hover:bg-[#5a9a7e] transition-colors"
          >
            View Firm Intel →
          </Link>
        </div>

        <p className="text-center text-xs text-[#71787c] mt-8">
          Questions? <a href="mailto:research@onluintel.com" className="underline hover:text-[#41484c]">research@onluintel.com</a>
        </p>
      </main>
    </div>
  );
}
