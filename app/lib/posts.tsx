// Shared post data — used by both the main page and /learn/[slug] routes

import type { ReactNode } from "react";

export interface InsightPost {
  slug: string;
  title: string;
  date: string;
  tag: string;
  paragraphs: string[];
  richContent?: ReactNode;
}

export const CAREER_POSTS: InsightPost[] = [
  {
    slug: "buyside-interview-questions",
    title: "What Buyside Interviews Are Really Asking (Even When the Questions Sound Different)",
    date: "March 30, 2026",
    tag: "Interview Prep",
    paragraphs: [
      `Spend enough time interviewing for buyside roles—whether in private credit, public credit, or special situations—and you start to notice a pattern. The surface-level questions vary slightly depending on the firm, the strategy, or the seniority of the seat. But underneath, the same handful of ideas come up again and again. The interview is less about what you know and more about how you think, how you prioritize, and how consistently you apply your framework under pressure.`,
      `Take the classic "walk me through your resume." On paper, it sounds like a warm-up question. In reality, it's one of the most important signals in the entire process. No one is looking for a chronological recap of your roles. What they're really assessing is whether your career path makes sense—whether each move reflects a deliberate decision rather than randomness. They're listening for a narrative that compounds: how you built skills, how your perspective evolved, and why this specific role is a natural next step. If your story feels inevitable in hindsight, you're in a strong position. If it feels stitched together, they'll notice.`,
      `The same applies to investment discussions. When someone asks you to walk through an idea you liked or didn't like, they're not testing whether you can find an interesting company. They're testing how you think about risk. Strong candidates instinctively start with downside—what can break, where the capital structure sits, how recovery looks in a stress case. They simplify complexity and focus on what actually drives outcomes. Weaker answers tend to drift into description: industry trends, surface-level growth narratives, or management quality without tying it back to valuation and risk-adjusted return. The difference is subtle, but it's decisive.`,
      `One of the most revealing moments often comes from a deceptively simple follow-up: "What could go wrong?" This is where intellectual honesty shows up. It's easy to present a clean investment case; it's much harder to articulate the real risks without defaulting to generic answers. Interviewers are listening for specificity and for evidence that you've actually pressure-tested your own thinking. In credit especially, this extends beyond business risk into structure—covenants, priming risk, liquidity pathways. If your risks sound interchangeable across any deal, it suggests you're not underwriting deeply enough.`,
      `Macro questions, like "where are we in the cycle," are less about being right and more about being coherent. There is no universally correct answer, and most interviewers aren't looking for one. What matters is whether you can connect your view of the environment to actual investment behavior. If spreads are tight, what does that change in how you size positions or evaluate risk? If liquidity tightens, how does that affect where you look for opportunity? Simply acknowledging uncertainty isn't enough; they want to see how your view translates into action.`,
      `Fit questions—"why this strategy" or "why this firm"—tend to be where otherwise strong candidates lose momentum. Generic answers stand out immediately. The bar here isn't memorizing facts about the firm; it's demonstrating that you understand what makes the strategy distinct and why that aligns with how you think about investing. This is also where self-awareness matters. Good answers reflect an understanding of what you're actually good at and why that maps onto the role. It's less about selling yourself broadly and more about showing a precise match.`,
      `Then there's the question almost everyone prepares for: "tell me about a time you were wrong." The intention is straightforward, but the execution often isn't. Many answers are either too polished or subtly defensive, framing the mistake as something external or unavoidable. The more compelling responses are the ones that are specific and uncomfortable in the right way. They show a clear misjudgment, a thoughtful diagnosis of what went wrong, and—most importantly—a change in process that came out of it. The underlying question isn't whether you've made mistakes; it's whether your mistakes have actually improved your underwriting.`,
      `Another question that tends to separate candidates is how they approach new ideas. When asked how you diligence an opportunity, interviewers aren't looking for a checklist. They're trying to understand how you allocate attention. What do you look at first? What causes you to walk away quickly? Where do you decide to spend incremental time because it might generate real insight? Investing, especially in buyside environments, is as much about filtering as it is about analysis. The ability to kill ideas early and go deep selectively is a core skill, and interviews are one of the few places where that process can be observed directly.`,
      `Finally, one of the highest-signal questions is often the simplest: "what are you working on right now?" This is where genuine curiosity—or the lack of it—becomes obvious. Candidates who are actively thinking about markets tend to have at least one idea they can discuss in depth, even if it's not fully formed. They can explain what's interesting, what's uncertain, and what they're trying to figure out next. Others rely entirely on prepared answers, and it shows. The difference isn't about having perfect ideas; it's about being engaged enough to generate them in the first place.`,
      `Stepping back, what ties all of these questions together is consistency. Buyside interviews are rarely about catching you out with something obscure. They're about observing whether you apply the same disciplined thinking across different contexts. Do you prioritize downside in every situation? Do you distinguish signal from noise? Can you communicate your reasoning clearly, even when the answer isn't obvious?`,
      `At a certain point, strong candidates stop feeling like they're responding to questions and start feeling like they're already doing the job. That shift—from answering to thinking out loud—is often what makes the difference.`,
    ],
  },
  {
    slug: "credit-hiring-capital-driven",
    title: "Why Credit Hiring Is Driven by Capital, Not Recruiting Cycles",
    date: "March 26, 2026",
    tag: "Career Prep",
    paragraphs: [
      `Unlike many corporate roles, hiring in credit funds is rarely driven by a fixed recruiting cycle. Instead, it is closely tied to capital availability and deployment needs.`,
      `When a fund raises a new vehicle, the immediate priority becomes putting capital to work. This often leads to incremental hiring within a relatively short window, particularly at the junior level where additional analytical capacity is required. Similarly, periods of increased market dislocation or strategy expansion can drive hiring as teams adjust to new opportunity sets.`,
      `Conversely, in periods where capital deployment slows or portfolios stabilize, hiring activity may be limited regardless of broader recruiting cycles. This dynamic means that many opportunities are filled opportunistically rather than through formal processes.`,
      `For candidates, this has an important implication: reacting to posted roles is often too late. A more effective approach is to understand which funds are likely to be active based on capital raises, market conditions, and strategy shifts, and to engage ahead of visible hiring processes.`,
    ],
  },
  {
    slug: "credit-avoiding-losses",
    title: "Credit Investing Is Primarily About Avoiding Losses, Not Finding Upside",
    date: "March 26, 2026",
    tag: "Career Prep",
    paragraphs: [
      `A common misconception among candidates transitioning from equity to credit is that the objective is to identify mispriced upside. In reality, credit investing is more fundamentally about avoiding permanent capital impairment.`,
      `This distinction drives a different analytical approach. Rather than focusing on how much a business can grow, credit investors prioritize how a business performs under stress and whether it can sustain its obligations across a range of downside scenarios. The emphasis is on durability of cash flow, asset coverage, and structural protections within the capital stack.`,
      `As a result, the key questions shift from "how good is this business" to "how bad can this get, and what protects us if it does." This includes evaluating liquidity runways, covenant flexibility, refinancing risk, and the potential behavior of other stakeholders in a distressed situation.`,
      `Understanding this mindset is critical not only for investing, but also for interviews. Candidates who frame their analysis around downside and recovery tend to align more closely with how credit decisions are actually made.`,
    ],
  },
  {
    slug: "what-credit-interviews-test",
    title: "What Credit Interviews Actually Test (and What They Don't)",
    date: "March 26, 2026",
    tag: "Career Prep",
    paragraphs: [
      `Many candidates approach credit interviews by focusing on memorizing technical concepts such as leverage ratios, FCCR, or yield calculations. While these are necessary, they are rarely what differentiates candidates in practice.`,
      `What interviewers are typically evaluating is whether a candidate can think through a situation as an investor. This includes the ability to identify key risks, understand how cash flow behaves under stress, and assess downside protection rather than simply describing a business at a high level.`,
      `Stronger candidates tend to frame their answers around questions such as: where does the capital structure break, what drives liquidity in a downside scenario, and how management decisions or documentation can impact recovery outcomes. In contrast, weaker candidates often stop at surface-level metrics without connecting them to real-world implications.`,
      `In this sense, credit interviews are less about recalling formulas and more about demonstrating judgment. The goal is not to show that you know the definitions, but that you can apply them in a way that reflects how investors actually underwrite risk.`,
    ],
  },
];

// ─── AI Ecosystem Post ───────────────────────────────────────────────────────

const AI_STACK_LAYERS = [
  { label: "Physical (EV / Robotics / Autonomy)",  color: "#4f46e5", gross: "10–20%",   note: "Largest TAM, lowest near-term margins",     companies: ["Tesla", "Waymo", "Figure AI", "Boston Dynamics", "Mobileye", "Rivian"] },
  { label: "Applications",                          color: "#0891b2", gross: "25–35%+",  note: "High margins; dependent on upstream costs",  companies: ["Salesforce", "Adobe", "ServiceNow", "Workday", "Cursor", "Perplexity"] },
  { label: "Middleware / Data Platforms",           color: "#059669", gross: "20–30%",   note: "Bridging layer; growing criticality",         companies: ["Palantir", "Databricks", "Snowflake", "Scale AI", "Weights & Biases"] },
  { label: "Foundation Models",                     color: "#d97706", gross: "Uncertain", note: "Innovation leader; risk of commoditisation",  companies: ["OpenAI", "Anthropic", "Meta (Llama)", "Google DeepMind", "Mistral"] },
  { label: "Cloud Infrastructure",                  color: "#dc2626", gross: "25–35%",   note: "Best durability; controls distribution",      companies: ["Microsoft Azure", "AWS", "Google Cloud", "Oracle Cloud"] },
  { label: "Networking & Optics",                   color: "#7c3aed", gross: "30–45%",   note: "Data-movement bottleneck; volume-driven",     companies: ["Broadcom", "Marvell", "Coherent Corp.", "Lumentum", "Ciena"] },
  { label: "Semiconductors / Compute",              color: "#ea580c", gross: "60–70%",   note: "Highest margin today; cyclical risk ahead",   companies: ["NVIDIA", "AMD", "Intel", "SK Hynix", "Micron", "Google TPU", "AWS Trainium"] },
];

const AI_MARGIN_BARS = [
  { label: "Semiconductors",     lo: 60, hi: 70, color: "#ea580c" },
  { label: "Networking & Optics",lo: 30, hi: 45, color: "#7c3aed" },
  { label: "Cloud",              lo: 25, hi: 35, color: "#dc2626" },
  { label: "Applications",       lo: 25, hi: 35, color: "#0891b2" },
  { label: "Middleware / Data",  lo: 20, hi: 30, color: "#059669" },
  { label: "Physical Systems",   lo: 10, hi: 20, color: "#4f46e5" },
  { label: "Foundation Models",  lo: 0,  hi: 15, color: "#d97706" },
];

const AI_POST_CONTENT = (
  <div className="space-y-5 text-[#23282e] text-sm leading-[1.75]">
    <p>Artificial intelligence is often reduced to a handful of names — large language models, chat interfaces, and a few hyperscalers. But AI is not a single layer. It is a full-stack ecosystem spanning semiconductors, infrastructure, data, software, and increasingly, the physical world. Understanding where value accrues requires looking across this entire chain. The most important opportunities are often not at the most visible layer.</p>

    {/* Stack diagram */}
    <div className="my-8 border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Figure 1 — The AI Value Chain Stack</p>
        <p className="text-[11px] text-gray-400 mt-0.5">Bottom = foundation layer · Top = end-user layer</p>
      </div>
      <div className="p-5 space-y-2">
        {AI_STACK_LAYERS.map((layer, i) => (
          <div key={i} className="flex items-stretch gap-3">
            <div className="w-2 rounded-full flex-shrink-0" style={{ backgroundColor: layer.color }} />
            <div className="flex-1 rounded-lg px-4 py-3 flex flex-col gap-2" style={{ backgroundColor: layer.color + "10" }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span className="text-xs font-bold" style={{ color: layer.color }}>{layer.label}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] text-gray-400">{layer.note}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border" style={{ color: layer.color, borderColor: layer.color + "40" }}>
                    {layer.gross} gross
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {layer.companies.map((co) => (
                  <span key={co} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">{co}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <h3 className="font-bold text-[#191c1e] text-base mt-6">The Foundation: Compute and the Hardware Layer</h3>
    <p>At the base of the ecosystem lies compute. Training and running modern AI models requires massive parallel processing, making GPUs the central building block. Companies like NVIDIA dominate through both hardware and a tightly integrated software ecosystem, while AMD and custom silicon efforts from Google and Amazon continue to scale.</p>
    <p>But compute does not operate in isolation. It sits within a broader hardware layer that includes memory, networking, and increasingly, optics. High-bandwidth memory from SK Hynix and Micron Technology is essential to model performance, while networking players like Broadcom and Marvell Technology enable GPUs to communicate across large clusters. As AI workloads scale, the bottleneck is shifting from compute itself to data movement — which is where optical interconnects become critical. Companies like Coherent Corp. and Lumentum Holdings provide optical components that allow data to move efficiently within and between data centers. In many respects, optics is becoming the circulatory system of AI infrastructure: less visible than GPUs, but equally essential for scaling.</p>

    <h3 className="font-bold text-[#191c1e] text-base mt-6">Cloud Infrastructure: The Aggregation Layer</h3>
    <p>Above hardware sits the cloud layer. Hyperscalers — Microsoft, Amazon, and Google — aggregate compute, storage, and networking into usable platforms, effectively acting as the operating system of modern AI development. Developers access AI resources without owning physical infrastructure. The economics here are powerful: capital intensive upfront, but highly scalable once deployed. Cloud providers sit at a central junction, capturing value from both upstream demand for compute and downstream demand for AI services. This is arguably the most structurally durable position in the stack — not because margins are the highest, but because control over distribution compounds over time.</p>

    <h3 className="font-bold text-[#191c1e] text-base mt-6">Models, Data, and Middleware</h3>
    <p>On top of infrastructure sits the model layer, where companies like OpenAI, Anthropic, and Meta Platforms develop large-scale foundation models. Yet competitive dynamics here are evolving quickly. Open-source alternatives and rapid iteration are compressing differentiation. Model quality still matters, but it is increasingly tied to data access and distribution rather than raw capability alone.</p>
    <p>If models are the engine, data is the constraint. Proprietary, well-structured data is becoming one of the most defensible assets in AI. Companies like Palantir Technologies are positioned around this thesis — focused not on frontier models but on integrating data, governance, and decision-making workflows within complex enterprise environments. Between models and applications, a growing middleware layer — including platforms like Databricks and Snowflake — is becoming critical. Value here accrues to companies that simplify complexity rather than add to it.</p>

    <h3 className="font-bold text-[#191c1e] text-base mt-6">Applications and the Physical World</h3>
    <p>At the top of the digital stack sits the application layer — copilots, automation tools, vertical-specific solutions. Companies like Salesforce and Adobe are embedding AI into existing workflows, while newer entrants build AI-native products. Historically this is where software margins have been highest, but in AI those margins are increasingly linked to upstream infrastructure costs.</p>
    <p>Finally, AI is extending into the physical world. Autonomous systems, robotics, and electric vehicles represent a layer where AI interacts directly with real environments. Companies like Tesla are integrating AI into self-driving platforms, while industrial players embed AI into manufacturing and logistics. This layer introduces new constraints — latency, safety, hardware integration — that do not exist in digital environments. Margins here are lower, but the total addressable market is arguably larger than any other layer.</p>

    {/* Margin comparison chart */}
    <div className="my-8 border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Figure 2 — Gross Margin Range by Layer</p>
        <p className="text-[11px] text-gray-400 mt-0.5">Approximate ranges; foundation models excluded due to uncertain economics</p>
      </div>
      <div className="p-5 space-y-3">
        {AI_MARGIN_BARS.map((bar, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-36 flex-shrink-0 text-right">{bar.label}</span>
            <div className="flex-1 relative h-6 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="absolute top-0 h-full rounded-full"
                style={{
                  left: `${bar.lo}%`,
                  width: `${bar.hi - bar.lo}%`,
                  backgroundColor: bar.color,
                  opacity: 0.85,
                }}
              />
            </div>
            <span className="text-xs font-semibold w-16 flex-shrink-0" style={{ color: bar.color }}>
              {bar.lo === 0 ? "TBD" : `${bar.lo}–${bar.hi}%`}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-3 pt-1">
          <span className="w-36 flex-shrink-0" />
          <div className="flex-1 flex justify-between text-[10px] text-gray-400 px-1">
            <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
          </div>
          <span className="w-16 flex-shrink-0" />
        </div>
      </div>
    </div>

    <h3 className="font-bold text-[#191c1e] text-base mt-6">Where Value Actually Accrues</h3>
    <p>Semiconductors are capturing the highest gross margins today — 60–70% for leading AI chips, driven by scarcity, performance differentiation, and software lock-in. This advantage is real, but partly cyclical. Over time, competition from AMD and in-house silicon from hyperscalers will compress margins as supply catches up to demand.</p>
    <p>Networking and optics players benefit from the same scaling dynamic at more moderate margins, but with volume-driven demand across the entire ecosystem rather than dependence on any single application. The cloud layer commands moderate margins (25–35%) but compensates through durability and compounding. Cloud providers monetize both sides of the AI value chain and benefit from switching costs that grow over time. Application companies can still achieve strong margins (25–35%+), but they are increasingly dependent on upstream cost structures — a structural shift relative to previous software cycles.</p>
    <p>The physical layer — EV, robotics, autonomy — operates at the lowest margins (10–20%), but represents the largest long-term opportunity. As AI moves from digital environments into physical systems, the scope of impact expands significantly. Over a multi-decade horizon, this may become the largest single pool of economic value, even if it is not the most profitable on a percentage basis today.</p>

    <h3 className="font-bold text-[#191c1e] text-base mt-6">The Key Insight for Investors</h3>
    <p>In the near term, compute and infrastructure matter most because they are the binding constraint. That is why the market has rewarded semiconductor and infrastructure players so heavily in this cycle. Over the long term, value tends to migrate toward control points — layers that own distribution, data, or customer relationships. Today, that increasingly points to cloud and, selectively, to application companies with strong embedded workflows and proprietary data.</p>
    <p>The most important takeaway is that AI is not a winner-take-all market at a single layer. It is a multi-layer profit pool where leadership — and value capture — shifts over time. Understanding where we are in that cycle is what ultimately drives returns. AI is not just a product. It is a system-level shift. And like most system-level shifts, the winners are rarely confined to the top layer everyone is watching.</p>
  </div>
);

const AI_COMMODITY_POST_CONTENT = (
  <div className="space-y-6 text-[#23282e] text-sm leading-[1.75]">

    <p>The last great commodity supercycle was a China story. The next one may be an AI story. The buildout of artificial intelligence infrastructure — data centres, power grids, cooling systems, and the hardware stacks that run them — is creating a demand shock across several commodity markets that is only beginning to be understood. At the same time, AI is reshaping the supply side of commodity markets in ways that will compound over the next decade.</p>
    <p>This is not a speculative thesis. It is already visible in power demand forecasts, copper order books, and water utility filings. The question for analysts is not whether AI will move commodity markets — it is which commodities, by how much, and over what timeframe.</p>

    {/* Pull quote */}
    <div className="my-6 border-l-4 border-[#396477] pl-5 py-1 bg-[#f7fbfd] rounded-r-xl">
      <p className="text-base italic text-[#191c1e] font-medium leading-snug">"Training a single frontier AI model can consume more electricity than 100 US homes use in a year. Multiply that by thousands of models, millions of inference calls per day, and the demand curve becomes something commodity markets have not seen before."</p>
    </div>

    {/* Section 1 */}
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">The Demand Side</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>

    {[
      {
        num: "01", cat: "Energy",
        title: "Power: The Most Direct and Immediate Impact",
        paras: [
          "Data centres currently account for roughly 1–2% of global electricity consumption. By 2030, depending on the pace of AI deployment, estimates from the IEA and Goldman Sachs suggest that figure could reach 3–4% — with AI inference workloads as the primary driver. Unlike traditional enterprise computing, which runs on predictable schedules, AI inference is always-on: every ChatGPT query, every API call, every real-time recommendation system draws power continuously.",
          "The implication for natural gas is significant. Renewable capacity is being added rapidly, but it cannot be dispatched on demand. When a hyperscaler needs 500MW of guaranteed baseload power for a new data centre campus, gas turbines are the answer — not solar panels. This is already showing up in US power market data: several grid operators have reversed previous forecasts of flat electricity demand and now project sustained growth through the end of the decade.",
          "Nuclear power is experiencing a related renaissance. Microsoft signed a deal to restart Three Mile Island. Google has contracted for small modular reactor capacity. Amazon has acquired a data centre campus directly adjacent to a nuclear plant. Uranium, after a decade of bear market following Fukushima, has entered a structural bull cycle driven in part by AI's insatiable appetite for clean, firm, baseload power.",
        ],
      },
      {
        num: "02", cat: "Metals",
        title: "Copper, Aluminium, and the Infrastructure Multiplier",
        paras: [
          "A hyperscale data centre is an extraordinarily copper-intensive structure. Power distribution systems, server racks, cooling infrastructure, fibre runs, and the transmission lines that connect the facility to the grid all require copper. Estimates suggest a large data centre campus (100–500MW) requires 20–40 tonnes of copper per megawatt of capacity — comparable to the copper intensity of offshore wind. With hundreds of new data centre campuses announced globally through 2027, the incremental copper demand from AI infrastructure alone could represent several hundred thousand tonnes per year.",
          "Aluminium follows a similar logic. Liquid cooling systems — increasingly preferred over air cooling for high-density AI chips — use aluminium heat exchangers and manifolds. Transmission infrastructure upgrades, required to connect new data centre campuses to the grid, are heavily aluminium-intensive in overhead lines. And the chassis of every server rack, every network switch, every UPS system is aluminium.",
          "The timing creates a problem: copper mine supply is structurally constrained. No major new mine has come online in the past decade without significant delays and cost overruns. Chilean grades are declining. The pipeline of projects that could add meaningful supply before 2030 is thin. AI-driven demand is arriving into a market that was already structurally tight due to the energy transition — the two demand shocks are compounding.",
        ],
      },
      {
        num: "03", cat: "Critical Minerals",
        title: "Silicon, Rare Earths, and the Chip Supply Chain",
        paras: [
          "AI accelerators — Nvidia GPUs, Google TPUs, custom ASICs — require a specific set of critical minerals at scale. High-purity silicon for wafers. Cobalt and tantalum for capacitors. Indium for displays and transistors. Gallium and germanium for compound semiconductors. These are not commodities in the traditional sense — they do not trade on exchanges with transparent price discovery — but their supply dynamics are increasingly central to AI development timelines.",
          "China controls refining capacity for many of these materials at levels that dwarf its share of raw ore production. It refines roughly 80% of the world's gallium, 60% of germanium, and dominates rare earth processing globally. When China imposed export controls on gallium and germanium in 2023 — framed as a response to US chip export restrictions — it demonstrated that the critical mineral supply chain is a geopolitical pressure point, not just a manufacturing input.",
          "For commodity analysts, the actionable insight is that AI chip demand creates a new class of concentrated supply risk. Unlike copper or oil, where disruptions are priced into liquid futures markets, disruptions in gallium or high-purity quartz (used in chip furnaces) are invisible until they manifest as production delays — at which point the impact is transmitted indirectly through tech earnings and capex cuts.",
        ],
      },
      {
        num: "04", cat: "Water",
        title: "The Hidden Commodity: Water Consumption at Scale",
        paras: [
          "Data centres are thirsty. Evaporative cooling towers — the dominant cooling method for large facilities — consume between 1 and 5 litres of water per kilowatt-hour of electricity consumed. A 100MW data centre running continuously can consume 1–5 billion litres of water per year. Microsoft's data centres consumed 1.7 billion litres of water in 2021; by 2022 that figure had grown to 6.4 billion litres, driven largely by AI workloads from ChatGPT training and inference.",
          "This is creating direct conflicts with agricultural and municipal water users in regions where data centres are concentrated — Northern Virginia, Phoenix, central Iowa, the Netherlands. Water utilities in several of these areas have begun reporting increased industrial demand from hyperscalers as a material factor in their capacity planning. In drought-prone regions, regulators are starting to impose water use restrictions on new data centre permitting.",
          "Water is not a commodity that trades globally, but it is a constraint that increasingly affects where AI infrastructure can be built, how quickly it can be permitted, and what its operating costs will be. For investors in agricultural commodities, the competition for water between AI data centres and irrigation in arid farming regions is an underappreciated long-term risk.",
        ],
      },
    ].map(s => (
      <div key={s.num} className="border-t border-gray-100 pt-6">
        <div className="flex items-baseline gap-4 mb-3">
          <span className="font-bold text-3xl text-gray-100 leading-none select-none">{s.num}</span>
          <div>
            <div className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">{s.cat}</div>
            <h3 className="font-bold text-[#191c1e] text-base leading-snug mt-0.5">{s.title}</h3>
          </div>
        </div>
        <div className="space-y-3">
          {s.paras.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    ))}

    {/* Supply side */}
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">The Supply Side</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>

    <h3 className="font-bold text-[#191c1e] text-base">How AI Changes Commodity Production</h3>
    <p>The demand story gets most of the attention, but AI is also reshaping the supply side of commodity markets in ways that will matter over a longer horizon.</p>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
      {[
        { icon: "⛏️", title: "Mining optimisation", desc: "AI-driven drilling and blast pattern optimisation is improving ore recovery rates at existing mines. Rio Tinto's autonomous haulage system has reduced fuel consumption and improved productivity at its Pilbara iron ore operations. This extends mine life and reduces the marginal cost of production — capping long-run prices." },
        { icon: "🌾", title: "Precision agriculture", desc: "AI-powered crop monitoring, yield prediction, and variable-rate fertiliser application are improving agricultural productivity at the field level. Platforms like Climate Corporation (Bayer) and John Deere's See & Spray are beginning to show measurable yield improvements — adding supply at the margin for grains and oilseeds." },
        { icon: "🛢️", title: "Seismic interpretation", desc: "AI models trained on seismic data are dramatically accelerating exploration timelines in oil and gas. Processes that took geophysicists months now take days. This is already changing how E&P companies allocate exploration capex — potentially bringing more reserves to market faster." },
        { icon: "⚡", title: "Grid management", desc: "AI-based demand forecasting and grid balancing is improving the utilisation of renewable capacity, reducing the need for gas peaker plants as backup. Long-run, this structurally pressures gas demand for power generation — even as AI data centres increase overall electricity demand." },
      ].map(c => (
        <div key={c.title} className="border border-gray-200 rounded-xl p-4 bg-white">
          <div className="text-xl mb-2">{c.icon}</div>
          <div className="text-xs font-bold text-[#191c1e] mb-1.5">{c.title}</div>
          <p className="text-[12px] text-gray-500 leading-relaxed">{c.desc}</p>
        </div>
      ))}
    </div>

    {/* Matrix */}
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">Impact Summary</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>

    <div className="overflow-x-auto border border-gray-200 rounded-xl">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Commodity</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">AI Demand Driver</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">AI Supply Effect</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Net Bias</th>
          </tr>
        </thead>
        <tbody>
          {[
            { name: "Electricity / Gas", demand: "Data centre baseload power, always-on inference workloads", supply: "Better grid efficiency, more renewables dispatch", bias: "Bullish", color: "text-red-600" },
            { name: "Copper", demand: "Data centre wiring, grid upgrades, cooling systems", supply: "AI optimises mine yields slightly", bias: "Strongly Bullish", color: "text-red-600" },
            { name: "Uranium", demand: "Nuclear preferred for firm clean baseload by hyperscalers", supply: "Limited new mine supply pipeline", bias: "Strongly Bullish", color: "text-red-600" },
            { name: "Aluminium", demand: "Liquid cooling, server chassis, transmission lines", supply: "Marginal efficiency gains in smelting", bias: "Bullish", color: "text-red-600" },
            { name: "Water", demand: "Evaporative cooling at hyperscale facilities", supply: "AI improves irrigation efficiency in agriculture", bias: "Regional — Bullish in arid zones", color: "text-amber-600" },
            { name: "Natural Gas", demand: "Peaker demand for data centre baseload", supply: "AI accelerates exploration; grid AI reduces peak demand", bias: "Mixed / Neutral", color: "text-gray-500" },
            { name: "Wheat / Corn", demand: "No direct link", supply: "AI precision ag improves yields over time", bias: "Mildly Bearish long-run", color: "text-emerald-600" },
            { name: "Gallium / Germanium", demand: "Compound semiconductors for AI chips", supply: "China-controlled; geopolitically constrained", bias: "Strongly Bullish", color: "text-red-600" },
          ].map((row, i) => (
            <tr key={row.name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
              <td className="px-4 py-3 font-bold text-[#191c1e] align-top border-b border-gray-100">{row.name}</td>
              <td className="px-4 py-3 text-gray-500 align-top border-b border-gray-100 leading-relaxed">{row.demand}</td>
              <td className="px-4 py-3 text-gray-500 align-top border-b border-gray-100 leading-relaxed">{row.supply}</td>
              <td className={`px-4 py-3 font-semibold align-top border-b border-gray-100 ${row.color}`}>{row.bias}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Conclusion */}
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">What This Means for Analysts</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>

    <p>The AI-commodity nexus is not a simple "AI is bullish for everything" story. It is a set of differentiated impacts that require commodity-by-commodity analysis. The clearest near-term trades are in power infrastructure (copper, uranium, natural gas for baseload) and critical minerals with concentrated supply chains (gallium, germanium, high-purity quartz). The supply-side improvements from AI — better mine optimisation, precision agriculture, faster seismic interpretation — are real but slower to materialise, with payoffs measured in years rather than quarters.</p>
    <p>For buyside analysts, the practical implication is twofold. First, any thesis on copper or uranium now requires a view on AI capex cycles — not just Chinese construction or EV adoption. Second, the geopolitical dimension of critical minerals has become a first-order risk factor in AI chip production, which feeds back into the capex of the hyperscalers, which feeds back into the power and metals demand forecasts. The commodity and technology sectors, historically analysed in separate silos, are now structurally linked.</p>

    <p className="text-[11px] text-gray-400 italic mt-2">For educational and informational purposes only. Not investment advice.</p>
  </div>
);

const COMMODITY_POST_CONTENT = (
  <div className="space-y-6 text-[#23282e] text-sm leading-[1.75]">
    {/* Intro */}
    <p>Commodities are the bedrock of the global economy. Oil powers transportation and petrochemicals; copper wires every building, vehicle, and data centre; wheat feeds billions; gold anchors monetary systems. Yet for all their importance, the price of a barrel of crude or a tonne of copper can swing 30%, 50%, even 100% within a single year — rewarding or ruining nations, corporations, and portfolios alike.</p>
    <p>Understanding what drives those swings requires thinking across multiple timescales simultaneously. A drought is measured in months. A new mine takes a decade to build. An energy transition redraws demand curves over decades. The analyst who can hold all of these timeframes in mind — and weigh them against each other — has a genuine edge.</p>
    <p>This piece sets out a systematic framework for commodity price analysis, covering the five major commodity classes — energy, metals, agricultural goods, precious metals, and soft commodities — and the structural drivers that cut across all of them: the US dollar, interest rates, geopolitical shocks, speculative positioning, and the long-cycle dynamics of capital expenditure.</p>

    {/* Pull quote */}
    <div className="my-6 border-l-4 border-[#396477] pl-5 py-1 bg-[#f7fbfd] rounded-r-xl">
      <p className="text-base italic text-[#191c1e] font-medium leading-snug">"Commodities are the original macro asset. Every price is simultaneously a signal about growth, geopolitics, technology, and climate — all at once."</p>
    </div>

    {/* Section: Five Classes */}
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">The Five Major Classes</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {[
        { icon: "🛢️", label: "Energy", sub: "Oil, Gas & Coal", desc: "The most geopolitically sensitive class. Crude oil alone accounts for roughly 3% of world GDP in annual trade value. OPEC+ supply decisions can move Brent by $10/bbl overnight." },
        { icon: "🔩", label: "Industrial Metals", sub: "Copper, Iron Ore, Aluminium", desc: "The classic economic growth proxies. Copper's correlation with Chinese PMI data is so reliable it earned the nickname \"Dr Copper.\" Mine supply pipelines stretch 10–15 years." },
        { icon: "🌾", label: "Agricultural", sub: "Wheat, Corn, Soybeans", desc: "Seasonally driven but profoundly affected by weather events, biofuel policy, and trade flows. The Russia-Ukraine conflict demonstrated how concentrated grain supply can be." },
        { icon: "🥇", label: "Precious Metals", sub: "Gold, Silver, Platinum", desc: "Gold functions as a monetary asset, inflation hedge, and fear gauge simultaneously. Its price is as much a reflection of real interest rates and central bank buying as of physical supply." },
        { icon: "☕", label: "Softs", sub: "Coffee, Sugar, Cotton", desc: "Highly weather-dependent. El Niño / La Niña cycles are the dominant structural driver, alongside chronic underinvestment in tropical agriculture in major producing nations." },
        { icon: "⚡", label: "Critical Minerals", sub: "Lithium, Cobalt, Nickel", desc: "The newest major class. Demand is driven by EV battery manufacturing and energy storage, but supply is geographically concentrated in a handful of politically complex jurisdictions." },
      ].map(c => (
        <div key={c.label} className="border border-gray-200 rounded-xl p-4 bg-white">
          <div className="text-xl mb-2">{c.icon}</div>
          <div className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider mb-1">{c.label}</div>
          <div className="text-xs font-bold text-[#191c1e] mb-1.5">{c.sub}</div>
          <p className="text-[12px] text-gray-500 leading-relaxed">{c.desc}</p>
        </div>
      ))}
    </div>

    {/* Section: Drivers */}
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">The Price Drivers in Depth</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>

    {[
      {
        num: "01", cat: "Supply Side",
        title: "Why Supply is Chronically Inelastic — and What That Means for Price Cycles",
        paras: [
          "The fundamental asymmetry in commodity markets is that demand can adjust relatively quickly — factories slow down, consumers switch fuels, countries alter diets — while supply responds with a lag measured in years, sometimes decades. Opening a new copper mine from discovery to first production takes 10–15 years and billions of dollars of capital. Planting new palm oil plantations and reaching maturity takes seven years. Developing a new deepwater oil field takes five to eight years.",
          "This creates the classic commodity cycle. High prices incentivise investment. Investment takes years to bear fruit. By the time new supply arrives, the market has already rebalanced — and the new supply creates a glut that depresses prices for years. Then underinvestment follows. And the cycle repeats. The 2004–2011 commodity supercycle and the subsequent 2012–2020 bear market are textbook examples of this mechanism playing out across energy and metals simultaneously.",
          "Supply is also subject to acute disruptions: pipeline explosions, mine strikes, droughts, hurricanes, sanctions, and export bans. These create price spikes whose duration is often inversely proportional to their severity — severe disruptions draw emergency production and demand destruction faster than mild ones. The analyst's job is to distinguish a temporary supply shock from a structural supply deficit.",
        ],
      },
      {
        num: "02", cat: "Demand Side",
        title: "China, the Energy Transition, and the Structural Demand Reshaping",
        paras: [
          "For two decades, China was the dominant demand variable in virtually every commodity market. Its urbanisation and industrialisation — the largest in human history — drove demand for steel, copper, cement, energy, and agricultural imports to levels that overwhelmed global supply pipelines. The commodity supercycle of the 2000s was, in large part, a China story.",
          "That story is now maturing. China's construction sector — the single largest consumer of steel and copper globally — is in structural contraction as the property bubble deflates. Chinese steel output may already be past its historical peak. The demand torch is partially passing to India, Southeast Asia, and sub-Saharan Africa, but none of these economies has the sheer scale to replicate China's impact in the near term.",
          "Simultaneously, the energy transition is creating a split within commodity markets. Fossil fuel demand faces long-run secular pressure as electrification accelerates. But the metals required to build that electrified world — copper for wiring, lithium for batteries, nickel for cathodes, rare earths for magnets — face a structural demand surge. A single electric vehicle contains roughly four times as much copper as an equivalent combustion engine vehicle. A utility-scale wind farm requires seven times the mineral inputs per unit of electricity as a gas-fired power plant. The transition is not a commodity demand destroyer; it is a commodity demand redirector.",
        ],
      },
      {
        num: "03", cat: "Macro Drivers",
        title: "The Dollar, Interest Rates, and Inflation: The Monetary Dimension",
        paras: [
          "Most commodities are priced in US dollars. This creates a direct mechanical link between the dollar's value and commodity prices: a stronger dollar makes commodities more expensive for non-dollar buyers, dampening demand and pressuring prices; a weaker dollar has the opposite effect. The DXY index and commodity indices show a strong negative correlation over medium-term horizons, with notable exceptions when commodity-specific supply shocks override the currency dynamic.",
          "Interest rates matter through two channels. First, they affect the opportunity cost of holding physical inventories — high rates make it expensive to finance commodity stockpiles, discouraging inventory building. Second, and more importantly, rates affect global growth expectations, which are the primary driver of industrial commodity demand. Rate hike cycles, by cooling credit-driven growth, historically coincide with commodity bear markets.",
          "Inflation creates a more nuanced dynamic. Commodity prices are simultaneously a cause of inflation (via energy and food costs) and a consequence of it (via money printing and negative real rates that push capital into hard assets). Gold is the clearest expression of this feedback loop: its price rises most strongly not when inflation is high per se, but when real interest rates — nominal rates minus inflation — are deeply negative.",
        ],
      },
      {
        num: "04", cat: "Geopolitics",
        title: "Resource Nationalism, Sanctions, and the Weaponisation of Commodities",
        paras: [
          "Geography concentrates commodity production in ways that create structural geopolitical risk. The Middle East holds two-thirds of proven oil reserves. The Democratic Republic of Congo produces roughly 70% of the world's cobalt. Chile and Peru account for nearly 40% of global copper mine output. Russia and Ukraine together were responsible for 29% of global wheat exports before 2022.",
          "Resource nationalism — governments seeking to capture a greater share of commodity rents through royalties, export taxes, and nationalisation — has been a recurring feature of high-price environments. Indonesia's 2022 nickel export ban, designed to force battery manufacturers to process ore domestically, sent nickel prices to record highs.",
          "The most dramatic recent example is Russia's invasion of Ukraine in 2022, which simultaneously disrupted global energy markets, grain markets, fertiliser markets, and metal markets. It demonstrated how a single geopolitical event can create cascading commodity shocks across multiple markets simultaneously — and why analysts must assess not just commodity fundamentals but the geopolitical fragility of supply chains.",
        ],
      },
      {
        num: "05", cat: "Inventories & Positioning",
        title: "Stocks-to-Use Ratios, Futures Curves, and Speculative Positioning",
        paras: [
          "In physical commodity markets, price is ultimately determined by the balance between supply and demand as reflected in inventory levels. The stocks-to-use ratio — the number of weeks of consumption held in storage — is the single most useful short-to-medium term price indicator in agricultural markets. When wheat stocks-to-use falls below eight weeks globally, prices become extremely sensitive to any supply disruption.",
          "Futures markets allow these expectations to be expressed in forward prices. The shape of the futures curve — whether it is in backwardation (spot price above futures) or contango (futures above spot) — encodes the market's view on near-term scarcity. A deeply backwardated crude oil curve signals physical tightness. A contango structure signals oversupply and incentivises physical storage.",
          "Speculative positioning — tracked via the CFTC's Commitment of Traders report — adds a short-term mean-reverting dynamic. When managed money is crowded long, small negative news can trigger violent liquidation. When speculators are max short, any positive catalyst sparks a short-covering rally. Extreme positioning can amplify price moves by 20–40% beyond what fundamentals alone would justify.",
        ],
      },
      {
        num: "06", cat: "Climate & Weather",
        title: "El Niño, Droughts, and the Increasingly Material Role of Climate Risk",
        paras: [
          "Weather has always been the dominant short-term driver of agricultural commodity prices — but climate change is making it increasingly relevant for energy and metals as well. Droughts reduce hydroelectric generation, forcing gas and coal substitution. European drought in 2022 reduced river levels so severely that coal barges in the Rhine couldn't reach German power plants.",
          "The El Niño-Southern Oscillation (ENSO) is the most reliably tradeable climate pattern. El Niño events — which occur every three to seven years — bring drought to Australia, Southeast Asia, and parts of South America while delivering excess moisture to the US corn belt. Traders who correctly identify an El Niño developing in May can position months ahead of market consensus.",
          "Looking forward, physical climate risk is increasingly embedded in long-duration commodity valuations. Water scarcity threatens copper processing in Chile's Atacama Desert. Permafrost thaw risks disrupting Arctic oil infrastructure. These risks are not yet fully priced by most market participants — creating both analytical hazard and opportunity.",
        ],
      },
    ].map(s => (
      <div key={s.num} className="border-t border-gray-100 pt-6">
        <div className="flex items-baseline gap-4 mb-3">
          <span className="font-bold text-3xl text-gray-100 leading-none select-none">{s.num}</span>
          <div>
            <div className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">{s.cat}</div>
            <h3 className="font-bold text-[#191c1e] text-base leading-snug mt-0.5">{s.title}</h3>
          </div>
        </div>
        <div className="space-y-3">
          {s.paras.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    ))}

    {/* Driver Table */}
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">Key Drivers by Commodity</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>

    <div className="overflow-x-auto border border-gray-200 rounded-xl">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px] w-32">Commodity</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Key Supply Drivers</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Key Demand Drivers</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Risk Tags</th>
          </tr>
        </thead>
        <tbody>
          {[
            { name: "Crude Oil", supply: "OPEC+ quotas, US shale rig count, geopolitical outages, capex cycles", demand: "Global GDP, Chinese industrial activity, air travel, petrochemical feedstock", tags: [["geo","Geopolitical"],["macro","Dollar"],["demand","China Cycle"]] },
            { name: "Natural Gas", supply: "LNG export capacity, pipeline infrastructure, US production volumes", demand: "Weather (heating/cooling), coal-to-gas switching, industrial demand, LNG imports", tags: [["supply","Storage Levels"],["geo","Russia/Ukraine"]] },
            { name: "Copper", supply: "Mine grades (declining), labour strikes (Chile/Peru), concentrate availability", demand: "Chinese construction, energy transition (EVs, grids), global industrial production", tags: [["demand","EV Upside"],["geo","Resource Nationalism"],["supply","Long Lead Times"]] },
            { name: "Iron Ore", supply: "Australian/Brazilian output (Vale, Rio, BHP), weather, port logistics", demand: "Chinese steel production, real estate construction, infrastructure policy", tags: [["demand","China Property"],["supply","Seaborne Supply"]] },
            { name: "Gold", supply: "Mine production (stable), recycling supply, central bank sales", demand: "Real interest rates, USD direction, central bank buying, jewellery, ETF flows", tags: [["macro","Real Rates"],["macro","Dollar"],["geo","Risk-Off"]] },
            { name: "Lithium", supply: "Brine/hard rock expansion, conversion capacity, Chinese processing", demand: "EV battery production, grid storage, cell chemistry shifts (LFP vs NMC)", tags: [["demand","EV Adoption"],["supply","China Dominance"]] },
            { name: "Wheat", supply: "Black Sea production, US/EU/Australian harvests, acreage decisions", demand: "Population growth, food aid, biofuel mandates, animal feed", tags: [["supply","Drought"],["geo","Export Bans"]] },
            { name: "Soybeans", supply: "US/Brazil/Argentina harvest, La Niña (key for South American crops)", demand: "Chinese crush demand (meal for pigs, oil for food), biodiesel mandates", tags: [["supply","La Niña"],["demand","China Protein"],["geo","US-China Trade"]] },
            { name: "Coffee", supply: "Brazil biennial crop cycle, Colombian rain, El Niño in Vietnam (Robusta)", demand: "Global consumption growth, premiumisation, on-trade recovery", tags: [["supply","Brazil Frost"],["supply","El Niño"]] },
            { name: "Nickel", supply: "Indonesian laterite production, stainless steel scrap, Philippines ore", demand: "Stainless steel (60%), EV battery cathodes (growing), alloy use", tags: [["geo","Indonesia Policy"],["demand","Battery Chemistry"]] },
          ].map((row, i) => {
            const tagColors: Record<string,string> = { supply: "bg-green-50 text-green-700", demand: "bg-amber-50 text-amber-700", macro: "bg-blue-50 text-blue-700", geo: "bg-red-50 text-red-700" };
            return (
              <tr key={row.name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                <td className="px-4 py-3 font-bold text-[#191c1e] align-top border-b border-gray-100">{row.name}</td>
                <td className="px-4 py-3 text-gray-500 align-top border-b border-gray-100 leading-relaxed">{row.supply}</td>
                <td className="px-4 py-3 text-gray-500 align-top border-b border-gray-100 leading-relaxed">{row.demand}</td>
                <td className="px-4 py-3 align-top border-b border-gray-100">
                  <div className="flex flex-wrap gap-1">
                    {(row.tags as [string,string][]).map(([type, label]) => (
                      <span key={label} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${tagColors[type]}`}>{label}</span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* Conclusion */}
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">The Analyst's Checklist</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>

    <p>Good commodity analysis requires answering a set of structured questions for each market under review. First, where are we in the supply cycle? Is capacity being built out or mothballed? What does the futures curve backwardation or contango tell us about near-term physical tightness? Second, what is the demand trajectory on a 12-month, 3-year, and 10-year view — and what structural forces (policy, technology, demographics) are likely to inflect it?</p>
    <p>Third, what is the macro environment doing to the commodity's key financial drivers — the dollar, real rates, credit conditions? Fourth, what geopolitical risks sit in the supply chain, and are they currently priced in or ignored? And fifth, what is speculative positioning telling you? Crowded longs with weak fundamentals are a warning; maximum shorts in a tightening physical market are an opportunity.</p>

    {/* Watch list sidebar */}
    <div className="border border-gray-200 rounded-xl overflow-hidden mt-4">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Watch List: Key Indicators</p>
      </div>
      <ul className="divide-y divide-gray-50">
        {[
          "CFTC Commitment of Traders — weekly positioning data",
          "LME & COMEX warehouse stock levels",
          "Chinese Caixin PMI Manufacturing",
          "API & EIA weekly crude inventory reports",
          "ENSO forecasts (CPC / IRI) for climate-driven commodities",
          "US Dollar Index (DXY)",
          "US 10-year TIPS yield (real interest rates)",
          "Baltic Dry Index (shipping demand signal)",
          "USDA WASDE report — monthly grains & oilseeds",
          "IEA & OPEC monthly oil market reports",
        ].map(item => (
          <li key={item} className="flex items-start gap-3 px-4 py-2.5 text-xs text-gray-600">
            <span className="text-orange-500 font-bold mt-0.5">→</span>
            {item}
          </li>
        ))}
      </ul>
    </div>

    <p className="text-[11px] text-gray-400 italic mt-4">For educational and informational purposes only. Not investment advice. Commodity markets involve significant risk of loss.</p>
  </div>
);

const NORTHEAST_ASIA_POST_CONTENT = (
  <div className="space-y-5 text-[#23282e] text-sm leading-[1.75]">
    <p>For most of the past decade, global equity investors have had a simple playbook: buy the S&P 500 and ignore everything else. American exceptionalism in corporate earnings, turbocharged by the Magnificent Seven, made it hard to argue otherwise. But if you've been paying attention to Northeast Asia over the past eighteen months, you'll have noticed something stirring — a confluence of governance reform, AI-driven earnings cycles, and valuation gaps wide enough to drive a truck through.</p>
    <p>China, Japan, and South Korea together represent roughly a quarter of global GDP and house some of the world's most technologically sophisticated companies. Yet their equity markets collectively trade at steep discounts to Wall Street. The question worth asking is no longer <em>why are they cheap?</em> — which has well-known structural answers — but rather <em>what's changing, and is the discount finally narrowing?</em></p>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#0F6E56] pl-3">Where things stand: a snapshot of each market</h3>

    <p><strong>Japan</strong> has been the darling of the international value crowd since the Tokyo Stock Exchange's landmark 2023 directive urging listed companies to get serious about capital efficiency. That campaign has teeth. The share of Japanese companies achieving an ROE above 8% with a price-to-book ratio above 1x has risen from around 37% in mid-2022 to 43% by mid-2025. Share buyback volumes roughly doubled in that period. The TOPIX trades at approximately 16x forward earnings — around 27% cheaper than the S&P 500 — and Japanese small caps are even more interesting at roughly 14x forward, a 38% discount to their US equivalents.</p>
    <p><strong>China's</strong> story is messier but potentially more rewarding. The Hang Seng Index rose about 29% in 2025, its best year since 2017, driven by a mix of policy stimulus, DeepSeek's emergence in the AI race, and a long-overdue valuation catch-up. The Hang Seng's forward P/E sits around 11.8x — still well below its 10-year peak of 15.5x. Earnings growth has been sluggish (low-to-mid single digits), so the rally has been mostly about multiple expansion. For it to continue, earnings need to follow.</p>
    <p><strong>South Korea</strong> has been the most dramatic performer. The KOSPI closed 2025 up 75.6% — its best year since 1987 and the highest-gaining major index globally — breaching 5,500 for the first time in early 2026. The drivers are twofold: the global AI-driven memory chip cycle (Samsung and SK Hynix together account for nearly 40% of the index) and sweeping corporate governance reforms under the Value-Up Program.</p>

    <div className="bg-white border border-gray-200 rounded-xl p-5 my-4">
      <p className="text-xs font-bold text-[#191c1e] mb-0.5">2025 full-year index returns</p>
      <p className="text-[11px] text-gray-400 mb-4">Korea's KOSPI posted its biggest gain in 26 years — dwarfing US benchmarks</p>
      <div className="flex gap-4 mb-4 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#3266ad] inline-block" />US</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#1D9E75] inline-block" />Northeast Asia</span>
      </div>
      <div className="space-y-2">
        {([
          { label: "KOSPI", value: 75.6, color: "#1D9E75" },
          { label: "Hang Seng", value: 27.8, color: "#1D9E75" },
          { label: "Nikkei 225", value: 26.7, color: "#1D9E75" },
          { label: "Nasdaq", value: 22.2, color: "#3266ad" },
          { label: "S&P 500", value: 14.5, color: "#3266ad" },
        ] as { label: string; value: number; color: string }[]).map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-24 text-[11px] text-right text-gray-500 flex-shrink-0">{item.label}</span>
            <div className="flex-1 bg-gray-100 rounded overflow-hidden">
              <div style={{ width: `${(item.value / 85) * 100}%`, background: item.color }} className="h-6 rounded flex items-center justify-end px-2">
                <span className="text-white text-[10px] font-bold">+{item.value}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-3">Sources: Korea Times, CNBC, Yahoo Finance. Price returns in local currency.</p>
    </div>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#0F6E56] pl-3">The valuation gap: why Asia trades cheaper</h3>

    <p>The discount across Northeast Asia relative to the US isn't random. It reflects several deeply embedded structural factors.</p>

    <div className="bg-white border border-gray-200 rounded-xl p-5 my-4">
      <p className="text-xs font-bold text-[#191c1e] mb-0.5">Forward P/E ratios: Asia vs. the US</p>
      <p className="text-[11px] text-gray-400 mb-4">Lower = cheaper relative to expected earnings — the gap is striking</p>
      <div className="space-y-2">
        {([
          { label: "Nikkei 225", value: 22.0, color: "#1D9E75" },
          { label: "S&P 500", value: 21.0, color: "#3266ad" },
          { label: "Shanghai Comp.", value: 16.4, color: "#1D9E75" },
          { label: "TOPIX", value: 16.2, color: "#1D9E75" },
          { label: "KOSPI", value: 14.0, color: "#1D9E75" },
          { label: "Japan small-cap", value: 13.9, color: "#1D9E75" },
          { label: "Hang Seng", value: 11.8, color: "#1D9E75" },
        ] as { label: string; value: number; color: string }[]).map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-28 text-[11px] text-right text-gray-500 flex-shrink-0">{item.label}</span>
            <div className="flex-1 bg-gray-100 rounded overflow-hidden">
              <div style={{ width: `${(item.value / 25) * 100}%`, background: item.color }} className="h-6 rounded flex items-center justify-end px-2">
                <span className="text-white text-[10px] font-bold">{item.value}x</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-3">Sources: FactSet, LSEG IBES, Hennessy Funds, MacroMicro. Forward P/E = price / consensus NTM EPS.</p>
    </div>

    <p><strong>Corporate governance gaps.</strong> Historically, Japanese companies sat on mountains of cash and cross-shareholdings, prioritizing stability over shareholder returns. Korean chaebols — family-controlled conglomerates like Samsung, Hyundai, and LG — have often prioritized controlling-family interests over minority shareholders. Chinese state-owned enterprises answer to political imperatives that don't always align with profit maximization. Global investors have rationally demanded a discount for these agency problems.</p>
    <p><strong>Geopolitical risk premia.</strong> China's market carries a permanent overhang from US-China tensions, Taiwan risk, and regulatory unpredictability. The US-China tariff truce, extended through November 2026, has helped, but the risk premium hasn't disappeared. Korea's proximity to North Korea and its export dependence on both US and Chinese demand create a different but real geopolitical haircut.</p>
    <p><strong>Currency and macro headwinds.</strong> The yen's chronic weakness has been both a tailwind for exporters and a headwind for foreign investors in unhedged terms. The Bank of Japan is still early in its rate normalization — with roughly two more 25bp hikes priced through 2026 — and the impact on equity multiples remains uncertain.</p>
    <p><strong>Sector composition.</strong> The US market's premium partly reflects its dominance in high-multiple sectors: software, platform businesses, and asset-light tech. Asian indices are heavier in industrials, financials, materials, and hardware — sectors that structurally command lower multiples. When you adjust for sector mix, some of the valuation gap shrinks — but not all of it.</p>

    <div className="border-t-2 border-b border-t-[#0F6E56] border-b-gray-200 py-5 my-6 text-center">
      <p className="text-base italic text-[#0F6E56] leading-snug max-w-lg mx-auto">"The old line that 'Asia is cheap for a reason' still applies. The difference in 2026 is that several of those reasons are being systematically dismantled."</p>
    </div>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#0F6E56] pl-3">What's changing: topics worth watching</h3>

    <p className="font-semibold text-[#191c1e]">1. Governance reform is becoming real, not rhetorical</p>
    <p>This is arguably the single most important structural story in Asian equities right now. Japan and Korea are both undertaking governance overhauls that are shifting from form to substance.</p>
    <p>In Japan, the TSE is planning to reduce TOPIX constituents from roughly 1,700 to around 1,200 by end-2028, pressuring companies to improve capital efficiency or face index exclusion. In Korea, the Value-Up Program has moved from voluntary signaling to hard law. By end-2025, 174 companies had disclosed Corporate Value-Up Plans. The National Assembly cut dividend tax rates from up to 45% down to 14–30%. In February 2026, Parliament mandated treasury share cancellation — eliminating a mechanism chaebol owners long used to entrench control.</p>

    <div className="bg-white border border-gray-200 rounded-xl p-5 my-4">
      <p className="text-xs font-bold text-[#191c1e] mb-0.5">Corporate governance reform timeline</p>
      <p className="text-[11px] text-gray-400 mb-5">Key milestones driving valuation re-rating in Japan and Korea</p>
      <div className="flex gap-4 mb-4 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#D85A30] inline-block" />Japan</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#534AB7] inline-block" />South Korea</span>
      </div>
      <div className="relative pl-6">
        <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />
        {([
          { date: "2023", color: "#D85A30", title: "TSE directive on capital efficiency", desc: "Tokyo Stock Exchange urges companies trading below 1x book to disclose improvement plans" },
          { date: "Feb 2024", color: "#534AB7", title: "Korea launches Value-Up Program", desc: "Voluntary disclosure guidelines, tax incentives, and the Korea Value-Up Index for institutional benchmarking" },
          { date: "2025", color: "#D85A30", title: "Japan shifts from form to substance", desc: "ROE >8% companies rise to 43%. Buybacks double. TSE announces TOPIX reduction to ~1,200 names by 2028" },
          { date: "Mid-2025", color: "#534AB7", title: "Korea amends Commercial Act", desc: "Directors' fiduciary duty now explicitly extends to all shareholders — not just controlling families" },
          { date: "Dec 2025", color: "#534AB7", title: "Dividend tax slashed", desc: "Korea cuts dividend tax from up to 45% down to 14–30%. 174 companies have filed Value-Up Plans" },
          { date: "Feb 2026", color: "#534AB7", title: "Mandatory treasury share cancellation", desc: "Parliament eliminates chaebol use of treasury shares to entrench control. KOSPI breaks 5,500" },
          { date: "Sep 2026 (upcoming)", color: "#534AB7", title: "Cumulative voting takes effect", desc: "Large listed companies must allow cumulative voting, giving minority shareholders real board representation" },
        ] as { date: string; color: string; title: string; desc: string }[]).map(item => (
          <div key={item.title} className="relative mb-5 last:mb-0">
            <div className="absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-white" style={{ background: item.color }} />
            <p className="text-[10px] uppercase tracking-wide text-gray-400">{item.date}</p>
            <p className="text-xs font-bold text-[#191c1e] mt-0.5">{item.title}</p>
            <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>

    <p className="font-semibold text-[#191c1e]">2. The AI and semiconductor cycle</p>
    <p>Northeast Asia sits at the heart of the global AI hardware supply chain. Korea's memory chip duopoly (Samsung and SK Hynix) is mission-critical for AI data centers. Taiwan's TSMC dominates logic fabrication. Japan's materials and equipment companies — from photoresists to precision machinery — are indispensable upstream suppliers.</p>
    <p>China is pursuing a different angle: domestic semiconductor self-sufficiency. Beijing's ambition to triple domestic chip production by 2026, combined with breakthroughs from companies like DeepSeek in large language models, has reinvigorated China's tech sector. The concentration risk, however, is real. Samsung and SK Hynix alone account for nearly 40% of the KOSPI — higher concentration than the Magnificent Seven in the S&P 500.</p>

    <p className="font-semibold text-[#191c1e]">3. China's consumption pivot and property stabilization</p>
    <p>China's GDP growth is projected around 4.5% for 2026, with the government gradually pivoting from export-and-infrastructure dependence toward domestic consumption. The property market remains the wild card. Targeted stabilization measures are underway, but the sector is far from healed. The deflation overhang is gradually lifting, but consumer confidence remains fragile.</p>

    <p className="font-semibold text-[#191c1e]">4. Japan's fiscal expansion under Takaichi</p>
    <p>Prime Minister Takaichi's administration has identified 17 industries as key growth drivers, including defence, AI, shipbuilding, and next-generation energy. Fiscal policy is turning more expansionary — abolishing the provisional gasoline tax, raising defense spending, and investing in advanced technology. This pro-growth stance, combined with gradual BOJ normalization, creates a reasonably constructive macro backdrop.</p>

    <p className="font-semibold text-[#191c1e]">5. The US dollar and capital flows</p>
    <p>Historically, periods of US dollar weakness have been bullish for Asian equities. As the dollar weakened through parts of 2025, capital flowed back toward emerging and Asian markets. If the Fed continues cutting rates while Asian central banks hold or tighten modestly, this tailwind could persist. A resurgent dollar on sticky US inflation would be the key risk to watch.</p>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#0F6E56] pl-3">Sensitivity to global &amp; US markets</h3>

    <p>Northeast Asian equities are not islands. They remain highly sensitive to global risk appetite. The pattern across recent market episodes is consistent: Asian indices amplify S&P 500 moves in both directions — falling harder in selloffs and rallying more sharply in recoveries.</p>

    <div className="bg-white border border-gray-200 rounded-xl p-5 my-4 overflow-x-auto">
      <p className="text-xs font-bold text-[#191c1e] mb-0.5">When the S&amp;P 500 moves, Asia amplifies it</p>
      <p className="text-[11px] text-gray-400 mb-4">Index moves during key episodes (2025–2026)</p>
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left font-semibold text-gray-400 pb-2 pr-3">Episode</th>
            {["S&P 500","Nikkei 225","KOSPI","Hang Seng"].map(h => (
              <th key={h} className="text-right font-semibold text-gray-400 pb-2 px-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {([
            { label: "Apr 2025 tariff selloff", vals: [-18, -22, -25, -15] },
            { label: "Apr–Dec 2025 recovery", vals: [17.9, 61.9, 76.5, 28.7] },
            { label: "Mar 2026 Iran oil shock", vals: [-8.0, -7.5, -10.1, -8.5] },
            { label: "Apr 8 2026 ceasefire rally", vals: [1.6, 5.4, 6.9, 3.0] },
          ] as { label: string; vals: number[] }[]).map(row => (
            <tr key={row.label} className="border-b border-gray-50 last:border-0">
              <td className="py-2 pr-3 text-gray-600 font-medium">{row.label}</td>
              {row.vals.map((v, i) => (
                <td key={i} className={`py-2 px-2 text-right font-bold tabular-nums rounded ${v >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {v > 0 ? "+" : ""}{v.toFixed(1)}%
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-gray-400 mt-3">Sources: CNBC, Yahoo Finance, OANDA. Approximate moves during each episode.</p>
    </div>

    <p><strong>Trade channel:</strong> All three economies are major exporters. A US recession or hard landing would ripple through Asian corporate earnings rapidly.</p>
    <p><strong>Financial channel:</strong> Global risk-off episodes tend to hit Asian markets harder than US markets, reflecting their higher beta to global liquidity. The classic pattern: US sneezes, Asia catches a cold.</p>
    <p><strong>Tech cycle linkage:</strong> The AI buildout is overwhelmingly driven by US hyperscaler capex. If US tech spending disappoints or AI revenue monetization falters, the downstream impact on Asian chip, equipment, and materials companies would be severe. This is not a decoupled trade.</p>
    <p><strong>Policy divergence risk:</strong> The Bank of Japan is tightening while the Fed is easing. If BOJ hikes surprise to the upside, the yen could strengthen sharply, pressuring Japanese exporter earnings.</p>

    <div className="bg-[#E1F5EE] rounded-xl px-5 py-4 my-4 text-[12px] leading-relaxed text-[#085041]">
      <strong>Key takeaway:</strong> The KOSPI's beta to the S&P is highest among the three, reflecting its concentration in cyclical semiconductor names. The Hang Seng's sensitivity is amplified by its role as a proxy for China risk sentiment. The Nikkei tracks US moves closely but with added yen volatility. Diversification? Partial at best — these are risk-on markets that amplify, not dampen, US drawdowns.
    </div>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#0F6E56] pl-3">The bottom line</h3>

    <p>The investment case for Northeast Asian equities in 2026 rests on a simple but powerful thesis: you're buying genuine structural reform, world-class technology exposure, and above-average earnings growth at a meaningful discount to the US. Japan at 16x forward earnings, Hong Kong at 12x, and Korea riding the strongest earnings growth cycle globally — these are not numbers you can easily find elsewhere.</p>
    <p>The risks are real: geopolitical flashpoints, currency volatility, concentration in a few mega-cap names, and deep cyclical linkage to US demand. But for investors who've spent years paying 22x+ for the S&P 500, Northeast Asia offers a different kind of equation — one where the margin of safety is wider, the reform catalysts are tangible, and the market hasn't fully priced in how much is actually changing beneath the surface.</p>

    <p className="text-[11px] text-gray-400 italic mt-4">This is commentary and analysis, not investment advice. All investing involves risk. Past performance is not indicative of future results.</p>
  </div>
);

const HOUSING_POST_CONTENT = (
  <div className="space-y-5 text-[#23282e] text-sm leading-[1.75]">
    <p>The US has systematically underbuilt housing for over a decade. The post-GFC pullback in construction never fully recovered, and what started as a cyclical undershoot has hardened into a structural gap — compounded by restrictive zoning, rising regulatory costs, and chronic labor shortages.</p>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#C84B31] pl-3">The Deficit That Won&apos;t Quit</h3>

    <p>Estimates of the total housing deficit range from 1.5 million units (NAHB) to 7 million (NLIHC for affordable rental). The median US home is now roughly 40 years old, and over a third of the stock predates 1980 — meaning existing inventory is aging and demanding significant capital reinvestment.</p>

    <div className="bg-white border border-gray-200 rounded-xl p-5 my-4">
      <p className="text-xs font-bold text-[#191c1e] mb-0.5">Estimated US Housing Shortage</p>
      <p className="text-[11px] text-gray-400 mb-4">Millions of units, by source methodology</p>
      <div className="space-y-2">
        {([
          { label: "NAHB", value: 1.5, color: "#C84B31" },
          { label: "Freddie Mac", value: 3.7, color: "#2D6A8F" },
          { label: "Brookings", value: 4.9, color: "#6B8F71" },
          { label: "NAR", value: 5.5, color: "#D4A84B" },
          { label: "NLIHC", value: 7.0, color: "#7B5EA7" },
        ] as { label: string; value: number; color: string }[]).map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-24 text-[11px] text-right text-gray-500 flex-shrink-0">{item.label}</span>
            <div className="flex-1 bg-gray-100 rounded overflow-hidden">
              <div style={{ width: `${(item.value / 8) * 100}%`, background: item.color }} className="h-6 rounded flex items-center justify-end px-2">
                <span className="text-white text-[10px] font-bold">{item.value}M</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-3">Sources: NAHB, Freddie Mac, Brookings, NAR, NLIHC.</p>
    </div>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#C84B31] pl-3">Where We Stand: Starts &amp; Permits</h3>

    <p>Housing starts bounced to a ~1.49M seasonally adjusted annual rate in January 2026, but building permits — the leading indicator of near-term supply — fell 5.4% month-over-month and 5.8% year-over-year, signaling continued caution from builders.</p>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
      {([
        { value: "1.49M", label: "Housing starts (Jan 2026 SAAR)" },
        { value: "1.38M", label: "Building permits (Jan 2026 SAAR)" },
        { value: "−5.8%", label: "Permits YoY decline" },
        { value: "873K", label: "Single-family permits" },
      ]).map(s => (
        <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-base font-bold text-[#191c1e]">{s.value}</div>
          <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{s.label}</div>
        </div>
      ))}
    </div>

    <p>Regional divergence is meaningful. The Midwest — Columbus, Indianapolis, Kansas City — is outperforming on relative affordability and tech investment, while previously hot markets like Texas and Florida are digesting pandemic-era overbuilding.</p>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#C84B31] pl-3">Builder Sentiment: 20+ Months Below Water</h3>

    <p>The NAHB/Wells Fargo Housing Market Index has been stuck below the 50 breakeven threshold for over 20 consecutive months. Around 37% of builders are cutting prices — average discount of 6% — and nearly two-thirds are deploying other incentives to move inventory.</p>

    <div className="bg-white border border-gray-200 rounded-xl p-5 my-4">
      <p className="text-xs font-bold text-[#191c1e] mb-0.5">NAHB Housing Market Index</p>
      <p className="text-[11px] text-gray-400 mb-4">Above 50 = more builders see conditions as good than poor</p>
      <div className="space-y-1.5">
        {([
          { label: "Jan 25", value: 47 },
          { label: "Mar 25", value: 39 },
          { label: "May 25", value: 34 },
          { label: "Jul 25", value: 34 },
          { label: "Sep 25", value: 41 },
          { label: "Nov 25", value: 46 },
          { label: "Jan 26", value: 37 },
          { label: "Mar 26", value: 38 },
        ] as { label: string; value: number }[]).map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-14 text-[11px] text-right text-gray-500 flex-shrink-0">{item.label}</span>
            <div className="flex-1 bg-gray-100 rounded overflow-hidden">
              <div style={{ width: `${(item.value / 65) * 100}%`, background: item.value >= 50 ? "#6B8F71" : "rgba(200,75,49,0.75)" }} className="h-5 rounded flex items-center justify-end px-2">
                <span className="text-white text-[10px] font-bold">{item.value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[11px] text-gray-400">
        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(200,75,49,0.75)" }} />Below 50 — negative</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#6B8F71]" />Above 50 — positive</span>
      </div>
    </div>

    <div className="border-l-[3px] border-[#C84B31] bg-gradient-to-r from-[rgba(200,75,49,0.04)] to-transparent px-5 py-4 my-4 rounded-r-lg">
      <p className="text-sm text-[#191c1e] italic">&ldquo;Affordability for buyers and builders remains a top concern. Many buyers remain on the fence waiting for lower interest rates and due to economic uncertainty.&rdquo;</p>
      <p className="text-[11px] text-gray-400 mt-1.5">— NAHB Chairman Bill Owens, March 2026</p>
    </div>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#C84B31] pl-3">The Tariff Tax on Housing Supply</h3>

    <p>The most consequential near-term headwind: layered tariffs on building materials that add an estimated <strong className="text-[#191c1e]">$17,500 per new home</strong> and could suppress output by 450,000 units through 2030. The contradiction is stark: the same administration signaling a national housing emergency has imposed tariffs on the very materials needed to address the shortage.</p>

    <div className="bg-white border border-gray-200 rounded-xl p-5 my-4">
      <p className="text-xs font-bold text-[#191c1e] mb-0.5">Tariff Rates on Key Building Materials</p>
      <p className="text-[11px] text-gray-400 mb-4">Effective rates as of early 2026</p>
      <div className="space-y-2">
        {([
          { label: "Kitchen Cabinets", value: 50, color: "#2D6A8F" },
          { label: "Steel / Copper / Aluminum", value: 50, color: "#6B8F71" },
          { label: "Canadian Softwood Lumber", value: 45, color: "#C84B31" },
          { label: "Upholstered Wood Products", value: 30, color: "#D4A84B" },
          { label: "All Timber & Lumber (base)", value: 10, color: "#7B5EA7" },
        ] as { label: string; value: number; color: string }[]).map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-40 text-[11px] text-right text-gray-500 flex-shrink-0 leading-tight">{item.label}</span>
            <div className="flex-1 bg-gray-100 rounded overflow-hidden">
              <div style={{ width: `${(item.value / 60) * 100}%`, background: item.color }} className="h-6 rounded flex items-center justify-end px-2">
                <span className="text-white text-[10px] font-bold">{item.value}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-3">Source: Brookings, TPC, NAHB estimates.</p>
    </div>

    <div className="grid grid-cols-3 gap-3 my-4">
      {([
        { value: "$17.5K", label: "Added cost per new home" },
        { value: "450K", label: "Fewer homes built through 2030 (est.)" },
        { value: "~60%", label: "Builders reporting tariff cost increases" },
      ]).map(s => (
        <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-base font-bold text-[#191c1e]">{s.value}</div>
          <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{s.label}</div>
        </div>
      ))}
    </div>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#C84B31] pl-3">The Affordability Bind</h3>

    <p>Mortgage rates have eased from their 2024 peaks to around 6% — the lowest in three years — but remain well above the sub-4% environment that locked millions of existing homeowners in place. The result: suppressed resale inventory pushes buyers toward new construction, but elevated costs make new homes a stretch for many.</p>

    <div className="bg-white border border-gray-200 rounded-xl p-5 my-4">
      <p className="text-xs font-bold text-[#191c1e] mb-0.5">30-Year Fixed Mortgage Rate</p>
      <p className="text-[11px] text-gray-400 mb-4">Annual average, percent</p>
      <div className="space-y-1.5">
        {([
          { label: "2019", value: 3.94 },
          { label: "2020", value: 3.11 },
          { label: "2021", value: 2.96 },
          { label: "2022", value: 5.34 },
          { label: "2023", value: 6.81 },
          { label: "2024", value: 6.72 },
          { label: "2025", value: 6.50 },
          { label: "Jan 2026", value: 6.06 },
        ] as { label: string; value: number }[]).map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-16 text-[11px] text-right text-gray-500 flex-shrink-0">{item.label}</span>
            <div className="flex-1 bg-gray-100 rounded overflow-hidden">
              <div style={{ width: `${(item.value / 8) * 100}%`, background: item.value > 5 ? "#C84B31" : "#2D6A8F" }} className="h-5 rounded flex items-center justify-end px-2">
                <span className="text-white text-[10px] font-bold">{item.value}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-3">Source: Freddie Mac Primary Mortgage Market Survey.</p>
    </div>

    <p>The market is bifurcated: the upper end holds, while lower and middle segments struggle. First-time buyers now form the majority of funded loans but face elevated price-to-income ratios. Builders are responding with smaller footprints and smart-home packages in affordable secondary metros.</p>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#C84B31] pl-3">Supply-Side Bottlenecks</h3>

    <p>Beyond tariffs, three persistent constraints throttle the industry&apos;s ability to close the housing gap: a ~400K construction labor shortfall vs. the 2007 peak, 15–20% wage inflation in hot metros, and regulatory costs comprising roughly 25% of a new home&apos;s price.</p>

    <div className="bg-white border border-gray-200 rounded-xl p-5 my-4">
      <p className="text-xs font-bold text-[#191c1e] mb-0.5">Construction Employment Index</p>
      <p className="text-[11px] text-gray-400 mb-4">Residential construction payrolls — index (2007 peak = 100)</p>
      <div className="space-y-1.5">
        {([
          { label: "2007", value: 100 },
          { label: "2010", value: 58 },
          { label: "2013", value: 64 },
          { label: "2016", value: 76 },
          { label: "2019", value: 84 },
          { label: "2022", value: 90 },
          { label: "2025", value: 88 },
        ] as { label: string; value: number }[]).map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-10 text-[11px] text-right text-gray-500 flex-shrink-0">{item.label}</span>
            <div className="flex-1 bg-gray-100 rounded overflow-hidden">
              <div style={{ width: `${item.value}%`, background: item.value === 100 ? "#2D6A8F" : "#C84B31" }} className="h-5 rounded flex items-center justify-end px-2">
                <span className="text-white text-[10px] font-bold">{item.value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-3">Industry still ~12% below prior peak employment. Source: BLS.</p>
    </div>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#C84B31] pl-3">What to Watch</h3>

    <p>Several variables will determine whether this market improves or stagnates through the end of the decade.</p>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
      {([
        { title: "Mortgage Rates", body: "Every 100bps of decline restores ~15% of buying power. Mid-5% range unlocks meaningful demand." },
        { title: "Tariff Policy", body: "Any exclusion process for building materials provides immediate supply-side relief." },
        { title: "Regional Shifts", body: "Midwest and secondary metros outperforming; TX/FL digesting prior overbuilding." },
        { title: "Construction Tech", body: "Modular, 3D printing, AI project management — promising but years from scale." },
      ]).map(w => (
        <div key={w.title} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs font-bold text-[#191c1e] mb-1">{w.title}</div>
          <div className="text-[12px] text-gray-500 leading-relaxed">{w.body}</div>
        </div>
      ))}
    </div>

    <p>The opportunity is immense. The execution challenges are daunting. For now, the market remains caught between a deficit and a hard place — building too few homes, at too high a cost, while the gap quietly grows.</p>

    <p className="text-[11px] text-gray-400 italic mt-4">This is commentary and analysis, not investment advice. Sources: US Census Bureau, HUD, NAHB/Wells Fargo HMI, Brookings, Freddie Mac, NAR, BLS.</p>
  </div>
);

const FUND_LETTERS_POST_CONTENT = (
  <div className="space-y-5 text-[#23282e] text-sm leading-[1.75]">
    <p>The first quarter of 2026 proved one of the most punishing in recent memory for markets — the S&P 500 posted its worst quarter since 2022, falling 4.6%, while tariff uncertainty, AI capex skepticism, and credit concerns rattled positioning across strategies. But a handful of major investors were well-prepared, and their letters offer an unusually candid window into how the best minds in the industry are thinking about what comes next.</p>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#0F6E56] pl-3">Q1 2026 Performance Snapshot</h3>

    <p>Returns across the major names were sharply divided. Macro-oriented funds and those with short books fared best; long-biased multi-strats had a rough quarter.</p>

    <div className="bg-white border border-gray-200 rounded-xl p-5 my-4">
      <p className="text-xs font-bold text-[#191c1e] mb-0.5">Reported / Estimated Q1 2026 Returns</p>
      <p className="text-[11px] text-gray-400 mb-4">Selected funds — sourced from public reporting</p>
      <div className="space-y-1.5">
        {([
          { label: "Greenlight Capital", value: 8.2, color: "#0F6E56" },
          { label: "Palm Valley Cap Fund", value: 0.74, color: "#6B8F71" },
          { label: "S&P 500 (benchmark)", value: -4.6, color: "#5b6472" },
          { label: "Balyasny Asset Mgmt", value: -3.8, color: "#ef4444" },
          { label: "ExodusPoint Capital", value: -4.5, color: "#ef4444" },
          { label: "Pershing Square (PSH)", value: -13.9, color: "#ef4444" },
        ] as { label: string; value: number; color: string }[]).map(item => (
          <div key={item.label} className="flex items-center gap-2.5">
            <span className="w-40 text-[11px] text-right text-gray-500 flex-shrink-0 truncate">{item.label}</span>
            <div className="flex-1 bg-gray-100 rounded overflow-hidden">
              <div
                style={{
                  width: `${Math.max(Math.abs(item.value) / 20 * 100, 4)}%`,
                  background: item.value < 0 ? "#ef4444" : item.color,
                  marginLeft: item.value < 0 ? "auto" : undefined,
                }}
                className="h-5 rounded flex items-center justify-end px-1.5"
              >
                <span className="text-white text-[10px] font-bold whitespace-nowrap">{item.value > 0 ? "+" : ""}{item.value}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-3">Sources: Hedgeweek, HedgeCo, Reuters/Investing.com, public NAV disclosures.</p>
    </div>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#0F6E56] pl-3">Greenlight Capital — Einhorn Turns Bearish, Gold Delivers</h3>

    <p>David Einhorn's Greenlight Capital was one of the standout performers of the quarter, gaining <strong className="text-[#191c1e]">+8.2%</strong> versus the S&P 500's –4.3% — a 12.5-point alpha gap. The macro book was the key driver, led by a <strong className="text-[#191c1e]">19% surge in gold</strong>, which Greenlight holds through both physical bars and call options. The long portfolio was modestly negative (–1.3%), but shorts contributed +5.3% and macro added another +5.3%.</p>

    <p>The more notable signal was a strategic shift in late February. Greenlight wrote that it had <em>"pivoted from conservative but not bearish, to bearish,"</em> cutting net long exposure to just 19% (86% long, 67% short) by quarter-end. Einhorn's letter stated: <em>"We suspect we are now in a bear market that is just starting."</em> With gold gaining another 6.2% in April, the positioning appears to have extended into the new quarter.</p>

    <div className="grid grid-cols-3 gap-3 my-4">
      {([
        { label: "Q1 Return", value: "+8.2%", sub: "vs S&P –4.3%", color: "#0F6E56" },
        { label: "Gold (Q1 gain)", value: "+19%", sub: "Key macro driver", color: "#D4A84B" },
        { label: "Net Long at Q-End", value: "19%", sub: "86L / 67S", color: "#2D6A8F" },
      ]).map(s => (
        <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-[10px] text-gray-400 mb-1">{s.label}</p>
          <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
        </div>
      ))}
    </div>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#0F6E56] pl-3">Pershing Square — Ackman Absorbs a Tough Quarter</h3>

    <p>Pershing Square Holdings (PSH) ended Q1 down <strong className="text-[#191c1e]">13.9% year-to-date</strong> through March 10, as its concentrated long book — heavily weighted toward mega-cap compounders — faced headwinds from the broader de-rating in high-multiple equities. The firm's February 2026 Annual Investor Presentation framed the year-to-date performance in the context of a longer-term compounding thesis, noting active share repurchases of PSH shares at a discount to NAV.</p>

    <p>Separately, Ackman has been pursuing a major strategic initiative: a public listing of Pershing Square Capital Management itself on the NYSE, targeting a raise of $5–10 billion. A <em>Fortune</em> profile in March described Ackman's ambition to build a <em>"modern-day Berkshire Hathaway."</em> The Q1 drawdown complicates the IPO narrative in the short run, but PSH continues to trade at a material discount to NAV — which Ackman argues is the opportunity.</p>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#0F6E56] pl-3">Howard Marks — A Warning on Private Credit</h3>

    <p>Howard Marks published two significant memos in Q1. The first, <em>"AI Hurtles Ahead"</em> (February 2026), charted the progression of AI from basic assistance (Level 1, 2023) to fully autonomous agents (Level 3, early 2026) — a shift Marks described as moving faster than most investors had priced. He noted consulting Anthropic's Claude to write a tutorial on AI developments, calling the technology's acceleration "remarkable."</p>

    <p>The more market-relevant memo arrived in April: <em>"What's Going on in Private Credit?"</em> Marks argued that the <strong className="text-[#191c1e]">$2 trillion direct lending market</strong> is now facing its first serious stress test since the GFC. The concerns:</p>

    <div className="space-y-2 my-4">
      {([
        { icon: "⚠", label: "Too much capital, deployed too fast", desc: "Many direct lenders 'accepted too much money and invested it too fast, applying standards that were too low.'" },
        { icon: "💻", label: "Software/AI exposure", desc: "AI has begun displacing the software sector's growth thesis — and many direct lending portfolios are overweight software borrowers." },
        { icon: "📉", label: "Spread compression", desc: "A decade of spread tightening has left little margin of safety at current entry prices." },
        { icon: "🛡", label: "Oaktree's own positioning", desc: "Oaktree reduced its direct lending and software exposure below peers, anticipating the correction." },
      ]).map(item => (
        <div key={item.label} className="flex gap-3 bg-white border border-gray-200 rounded-lg p-3.5">
          <span className="text-base mt-0.5 flex-shrink-0">{item.icon}</span>
          <div>
            <p className="text-xs font-semibold text-[#191c1e]">{item.label}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>

    <p>Despite the warnings, Marks concluded there is <em>"no systemic problem"</em> in private credit — rather, a targeted correction in over-leveraged software and lower-quality direct lending vintages. Selective managers with higher underwriting standards should be fine.</p>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#0F6E56] pl-3">Man Group — "Too Hard to Price"</h3>

    <p>Man Group's Q1 2026 Hedge Fund Strategy Outlook was titled <em>"Too Hard to Price?"</em> — a phrase that captured the quarter's defining challenge. Three forces dominated: <strong className="text-[#191c1e]">geopolitics</strong> (tariffs, Middle East tensions), <strong className="text-[#191c1e]">monetary policy uncertainty</strong> (the next Fed chair, diverging rate paths), and <strong className="text-[#191c1e]">AI capex skepticism</strong> (concerns about uncertain business models priced into the market).</p>

    <p>Man upgraded its outlook for three strategies heading into Q2: <strong className="text-[#191c1e]">Long-Biased Equity L/S</strong>, <strong className="text-[#191c1e]">Market Neutral Equity L/S</strong>, and <strong className="text-[#191c1e]">Merger Arbitrage</strong> (driven by record M&A activity). The only negative-rated strategy remains Distressed Credit — too early to offer attractive risk/reward. The core thesis: elevated dispersion and lower single-stock correlations create a fertile environment for active stock selection, even if calling market direction is difficult.</p>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#0F6E56] pl-3">Common Themes Across the Season</h3>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
      {([
        { theme: "Gold as Reserve Asset", desc: "Einhorn and others see gold displacing Treasuries as the default macro hedge, especially as fiscal credibility concerns mount.", color: "#D4A84B" },
        { theme: "Private Credit Stress", desc: "Marks isn't alone — multiple managers flagged that direct lending vintages from 2021–2023 are increasingly showing cracks, particularly in software-heavy portfolios.", color: "#C84B31" },
        { theme: "Bear Market Emerging?", desc: "Greenlight made the most direct call, but the cautious tone was widespread — net long exposures across L/S funds fell materially through March.", color: "#2D6A8F" },
        { theme: "AI: Still Uncertain", desc: "Enthusiasm for AI remains high but market pricing is getting scrutinized. Man Group flagged uncertain business models; Marks charted AI's acceleration with genuine awe and caution.", color: "#7B5EA7" },
        { theme: "Dispersion Over Direction", desc: "The consensus view: don't try to call the market. Instead, pick winners and losers — dispersion is historically elevated, rewarding skilled stock selection.", color: "#0F6E56" },
        { theme: "Tariff Volatility", desc: "Policy uncertainty around tariffs was cited by virtually every letter as a key source of macro noise, with second-order effects on supply chains and credit conditions still playing out.", color: "#6B8F71" },
      ]).map(t => (
        <div key={t.theme} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
            <p className="text-xs font-bold text-[#191c1e]">{t.theme}</p>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">{t.desc}</p>
        </div>
      ))}
    </div>

    <p className="text-[11px] text-gray-400 italic mt-4">This post summarizes publicly available investor letters, memos, and performance reports. Sources include Hedgeweek, Reuters, HedgeCo, Oaktree Capital, Man Group, and public NAV disclosures. Not investment advice.</p>
  </div>
);

const ABF_POST_CONTENT = (
  <div className="space-y-5 text-[#23282e] text-sm leading-[1.75]">
    <p>For a decade, the private credit story was a direct lending story. Banks pulled back after the Global Financial Crisis, regulation tightened, and middle-market sponsors needed a new balance sheet to call. Direct lending funds filled that gap, institutionalized it, and turned it into a $1.5-trillion-plus asset class. The second decade looks different. The flows, the fundraising, and the structural conversation have all shifted toward a parallel market: asset-based finance — loans collateralized not by a borrower&apos;s future EBITDA, but by pools of tangible assets or contractual cash flows. It now sits at the center of nearly every 2026 outlook letter, and a recent SuperReturn Private Credit audience poll found that institutional investors consider ABF the most attractive corner of private credit heading into the year.</p>

    {/* Stat band */}
    <div className="grid grid-cols-3 gap-0 border border-gray-200 rounded-xl overflow-hidden my-6">
      {[
        { label: "Market Size — Today", num: "$5.2T", caption: "Private ABF AUM est., growing to ~$7.7T by 2027 per KKR. DealCatalyst sees a path to $20T over the next decade." },
        { label: "Specialty Finance Fundraising", num: "~$35B", caption: "Target size of the ten largest specialty finance funds currently in market, per With Intelligence." },
        { label: "Private Credit 10Y Return", num: "9.0%", caption: "Annualized with 2.9% volatility, vs ~5.5% for leveraged loans and ~5.2% for high yield, per JPMAM." },
      ].map((s, i) => (
        <div key={i} className={`p-5 bg-white ${i < 2 ? "border-r border-gray-200" : ""}`}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{s.label}</p>
          <p className="text-3xl font-bold text-[#1A2B4A] tracking-tight">{s.num}</p>
          <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">{s.caption}</p>
        </div>
      ))}
    </div>

    <p>The headline numbers have done a lot of the marketing work. KKR pegs the private ABF market at around $5.2 trillion today and expects it to reach roughly $7.7 trillion by 2027. DealCatalyst cites a more aggressive path — a $20-trillion ABF market over the next decade. Whatever the right midpoint is, the direction is unambiguous: ABF is no longer the boutique corner of private credit. It is becoming the asset class itself.</p>

    <blockquote className="border-l-2 border-[#396477] pl-4 italic text-[#23282e] my-4">
      &ldquo;The easy beta of the last cycle is gone. Returns today are driven by the ability to originate with precision, structure with creativity, and manage risk with discipline.&rdquo;
      <span className="block mt-2 text-[11px] not-italic font-semibold text-gray-400 uppercase tracking-wider">— Carlyle, 2026 Credit Outlook</span>
    </blockquote>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#396477] pl-3">What ABF Actually Is</h3>
    <p>Asset-based finance is an umbrella for privately originated loans secured by diversified pools of collateral — consumer receivables, auto loans, residential and commercial mortgages, equipment leases, royalty streams, fund finance lines, trade receivables, and an expanding frontier of esoteric assets like music catalogs, data-center leases, and litigation payouts. It is the private-market cousin of public securitization, but structured bilaterally and held by a single lender or small club.</p>
    <p>The distinction from direct lending is the part that matters for portfolio construction. Direct lending is corporate credit: one borrower, one enterprise value, one bullet maturity. ABF is structured credit: many underlying obligors, observable collateral with value independent of any single operating business, and a self-amortizing profile where principal is returned over the life of the loan rather than at the end. JPMorgan&apos;s private bank estimates that a typical ABF investment structured as a finance lease aims to return roughly three-quarters of principal within the first three years.</p>

    {/* Comparison table */}
    <div className="border border-gray-200 rounded-xl overflow-hidden my-6">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Direct Lending vs Asset-Based Finance</p>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[#1A2B4A] text-white">
            <th className="text-left px-4 py-3 font-semibold">Dimension</th>
            <th className="text-left px-4 py-3 font-semibold border-l border-white/20">Direct Lending</th>
            <th className="text-left px-4 py-3 font-semibold border-l border-white/20">Asset-Based Finance</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Credit risk", "Concentrated on one borrower's EBITDA", "Diversified across many obligors or assets"],
            ["Collateral", "Corporate assets tied to operations", "Tangible assets or contractual receivables"],
            ["Amortization", "Bullet — principal back at maturity", "Self-amortizing — returns through life of loan"],
            ["Duration", "5–7 years typical", "Often shorter; compressed by amortization"],
            ["Cycle behavior", "Tracks corporate credit cycle", "Decoupled; tied to asset performance"],
            ["Return profile", "Spread over SOFR + fees + OID", "~200–250 bps over comparable public ABS"],
          ].map(([dim, dl, abf], i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="px-4 py-3 font-semibold text-[#1A2B4A]">{dim}</td>
              <td className="px-4 py-3 text-[#23282e] border-l border-gray-100">{dl}</td>
              <td className="px-4 py-3 text-[#23282e] border-l border-gray-100">{abf}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#396477] pl-3">Why Now — Four Structural Drivers</h3>
    <p>The ABF narrative is not about a rate cycle or a single macro view. Four separate forces are pointing in the same direction, each on its own enough to reshape allocator behavior.</p>

    <div className="grid grid-cols-2 gap-3 my-4">
      {[
        { num: "01", color: "border-[#d99968]", title: "Bank retrenchment becomes permanent", body: "Basel IV and tighter US capital treatment make balance-sheet lending structurally more expensive for banks. Forward-flow agreements are shifting specialty portfolios to private credit. The partnership model is now the default." },
        { num: "02", color: "border-[#7d8f66]", title: "Insurance capital finds its shape", body: "Insurers need long-dated, investment-grade cash flows — exactly what ABF produces. Apollo, KKR, Brookfield, and Carlyle have all built insurance-linked origination platforms, creating captive demand for ABF paper." },
        { num: "03", color: "border-[#8a76a0]", title: "Decoupled from the corporate cycle", body: "Allocators worried about late-cycle leveraged loans — rising PIK, falling coverage, cov-lite docs — want credit that doesn't depend on PE-owned EBITDA holding up. Cambridge Associates is explicitly favoring ABF over direct lending for 2026." },
        { num: "04", color: "border-[#6d8391]", title: "Complexity protects spread", body: "ABF requires origination infrastructure, servicing, data pipes, and legal structuring capacity that a generalist direct lender can't spin up. Those barriers translate directly into wider, more durable spreads — the opposite of what's happening in the upper middle market." },
      ].map((d) => (
        <div key={d.num} className={`bg-gray-50 border border-gray-200 border-t-4 ${d.color} rounded-xl p-4`}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">{d.num}</p>
          <p className="font-semibold text-[#1A2B4A] text-sm mb-1.5">{d.title}</p>
          <p className="text-xs text-[#23282e] leading-relaxed">{d.body}</p>
        </div>
      ))}
    </div>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#396477] pl-3">The Sub-Segments Allocators Are Sorting Between</h3>
    <p>&ldquo;ABF&rdquo; is doing a lot of work as a label. Underneath it sits a set of sub-markets with very different risk profiles and return expectations.</p>

    <div className="grid grid-cols-3 gap-2 my-4">
      {[
        { color: "bg-[#d99968]", name: "Consumer Finance", desc: "Auto loans, credit card receivables, BNPL. High volume, data-driven underwriting." },
        { color: "bg-[#7d8f66]", name: "Residential Mortgage", desc: "Non-QM, jumbo, seconds, HELOCs. Rate-sensitive, deep secondary liquidity." },
        { color: "bg-[#8a76a0]", name: "Commercial & Equipment", desc: "Equipment leases, small-ticket CRE, fleet financing. Tangible collateral." },
        { color: "bg-[#6d8391]", name: "Fund Finance", desc: "NAV lending, subscription lines, GP financing. Tightest spreads, best counterparties." },
        { color: "bg-[#b89a5a]", name: "Contractual Cash Flow", desc: "Royalties, pharma, litigation finance, data-center leases. The esoteric frontier." },
        { color: "bg-[#b87878]", name: "Real Asset-Linked", desc: "Energy infrastructure, mineral rights, agricultural assets. Long-dated, insurance-matched." },
      ].map((s) => (
        <div key={s.name} className="bg-white border border-gray-200 rounded-xl p-3">
          <div className={`w-2 h-2 rounded-full ${s.color} mb-2`} />
          <p className="font-semibold text-[#1A2B4A] text-xs mb-1">{s.name}</p>
          <p className="text-[11px] text-gray-500 leading-snug">{s.desc}</p>
        </div>
      ))}
    </div>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#396477] pl-3">The Scandal That Almost Derailed the Story — And Didn&apos;t</h3>
    <p>No ABF conversation in 2026 is complete without Tricolor and First Brands. Tricolor, a subprime auto lender, collapsed into bankruptcy in September 2025 after evidence emerged that the same vehicles had been pledged as collateral on multiple loans. First Brands followed shortly after. JPMorgan, Barclays, and a long list of private credit managers were exposed.</p>
    <p>The more careful read — from Cambridge Associates, Rithm Capital, and KBRA — is that both failures were idiosyncratic, driven by fraud and weak lender controls rather than systemic ABF flaws. The lesson is not that ABF is broken. It is that the discipline of ABF — separate servicing, independent verification, sole-lender control, asset-level daily monitoring — is what distinguishes good ABF from expensive unsecured lending in a trench coat.</p>

    {/* Risk callout */}
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 my-4">
      <p className="text-xs font-semibold text-rose-600 uppercase tracking-widest mb-3">What to underwrite when underwriting an ABF manager</p>
      <div className="space-y-2 text-xs text-[#23282e]">
        <p><strong className="text-[#191c1e]">Collateral control.</strong> Who holds the cash? Who controls the servicer? Can the manager step in and liquidate, or do they depend on borrower good behavior? This is the single most important question post-Tricolor.</p>
        <p><strong className="text-[#191c1e]">Data infrastructure.</strong> Is reporting asset-level and daily, or pool-level and monthly? Managers with proprietary monitoring systems will charge for it — and earn it.</p>
        <p><strong className="text-[#191c1e]">Origination depth.</strong> Is the manager originating directly, partnering with a bank under forward-flow, or buying finished paper? Each model has a different risk profile and fee structure.</p>
        <p><strong className="text-[#191c1e]">Alignment.</strong> How much first-loss or vertical slice is the manager holding? Skin in the game matters more in ABF because diversification of the underlying pool makes manager incentives the primary quality signal.</p>
      </div>
    </div>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#396477] pl-3">Key Players</h3>
    <div className="grid grid-cols-3 gap-2 my-3">
      {[["Apollo","Atlas SP"],["KKR","Private ABF"],["Blackstone","BXCI ABF"],["Carlyle","Opportunistic Cr."],["Ares","Alt. Credit"],["Brookfield","Structured Cr."],["Nomura CM","Multi-mgr ABF"],["Janus / VPC","Specialty ABF"],["Rithm","Collateral control"]].map(([firm, platform]) => (
        <div key={firm} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
          <span className="text-xs font-semibold text-[#1A2B4A]">{firm}</span>
          <span className="text-[10px] text-gray-400">{platform}</span>
        </div>
      ))}
    </div>

    <h3 className="font-bold text-[#191c1e] text-base mt-8 border-l-[3px] border-[#396477] pl-3">What to Read from the Shift</h3>
    <p>The broader signal embedded in the ABF rotation is about where private credit is in its own cycle. Direct lending matured, spreads compressed, documentation weakened, and the marginal capital deployed into the upper middle market is now earning a return difficult to distinguish from the BSL market. ABF is where the complexity premium still exists — and where the frontier of the asset class is still being defined.</p>
    <p>For allocators, naming exposure to &ldquo;ABF&rdquo; the way one might have named exposure to &ldquo;direct lending&rdquo; in 2018 is not going to be enough. Sub-strategy selection matters. Servicer quality matters. And manager selection — specifically the ability to distinguish between a disciplined, control-oriented ABF shop and a yield-chasing pool buyer — is about to become one of the highest-leverage decisions in a credit portfolio.</p>

    {/* Closing */}
    <div className="bg-[#1A2B4A] rounded-xl p-5 mt-6">
      <p className="text-xs font-semibold text-[#6aab8e] uppercase tracking-widest mb-2">The short version</p>
      <p className="text-white text-sm leading-relaxed">ABF is not a fad driven by one rate cycle. It is a structural re-plumbing of where non-bank credit gets made, who holds it, and how it is returned. The capital is early, the infrastructure is still being built, and the managers who win are going to be the ones who treat collateral control and data as the product — not the yield.</p>
    </div>

    <p className="text-[11px] text-gray-400 italic mt-4">Sources: Carlyle 2026 Credit Outlook; JPMorgan Private Bank (Mar &apos;26); KKR Insights; Cambridge Associates; Rithm Capital white paper (Dec &apos;25); With Intelligence Private Credit Outlook 2026; Janus Henderson / VPC. Not investment advice.</p>
  </div>
);

export const INDUSTRY_POSTS: InsightPost[] = [
  {
    slug: "abf-eating-private-credit",
    title: "Why Asset-Based Finance Is Eating Private Credit's Lunch",
    date: "April 21, 2026",
    tag: "Private Credit",
    paragraphs: [],
    richContent: ABF_POST_CONTENT,
  },
  {
    slug: "q1-2026-fund-letters-roundup",
    title: "Q1 2026 Investor Letters: What the Top Funds Are Saying",
    date: "April 11, 2026",
    tag: "Fund Letters",
    paragraphs: [],
    richContent: FUND_LETTERS_POST_CONTENT,
  },
  {
    slug: "housing-construction-2026",
    title: "US Residential Construction: Caught Between a Deficit and a Hard Place",
    date: "April 9, 2026",
    tag: "Real Estate",
    paragraphs: [],
    richContent: HOUSING_POST_CONTENT,
  },
  {
    slug: "northeast-asia-trifecta-2026",
    title: "The Northeast Asian Trifecta: Why China, Japan & Korea Deserve a Closer Look in 2026",
    date: "April 8, 2026",
    tag: "Macro",
    paragraphs: [],
    richContent: NORTHEAST_ASIA_POST_CONTENT,
  },
  {
    slug: "ai-commodity-price-impact",
    title: "How AI Development Is Reshaping Commodity Markets",
    date: "April 8, 2026",
    tag: "Commodities",
    paragraphs: [],
    richContent: AI_COMMODITY_POST_CONTENT,
  },
  {
    slug: "commodity-price-drivers",
    title: "The Raw World: What Actually Moves Commodity Prices",
    date: "April 7, 2026",
    tag: "Commodities",
    paragraphs: [],
    richContent: COMMODITY_POST_CONTENT,
  },
  {
    slug: "ai-ecosystem-value-chain",
    title: "The AI Ecosystem: Mapping the Full Value Chain",
    date: "April 6, 2026",
    tag: "Tech / AI",
    paragraphs: [],
    richContent: AI_POST_CONTENT,
  },
  {
    slug: "fixed-income-101",
    title: "Fixed Income 101: How Credit Markets Actually Work",
    date: "April 6, 2026",
    tag: "Credit",
    paragraphs: [],
    richContent: (
      <div className="space-y-5 text-[#23282e] text-sm leading-[1.75]">
        <p>If equities are driven by growth and narrative, fixed income is driven by math, discipline, and risk. It is often perceived as the "safer" part of markets, but in reality, credit markets are where macro expectations, downside risk, and capital structure all intersect in the most direct way. To understand fixed income is to understand how the market prices time, risk, and uncertainty.</p>

        <p>At the most basic level, a bond is simple: you lend money, receive periodic payments, and get your principal back at maturity. But how that bond trades — and what it implies about the world — is far more complex. The first distinction most investors encounter is between current yield and yield to maturity. Current yield measures the income you receive today relative to the bond's price. Yield to maturity is the market's full return expectation — it incorporates the coupon, any gain or loss from buying above or below face value, and the time value of money. This is why credit investors anchor on yield to maturity: it reflects total economic return, assuming the issuer survives.</p>

        <h3 className="font-bold text-[#191c1e] text-base mt-6">The Yield Curve: The Market's Expectations in One Line</h3>
        <p>Beyond individual bonds, the yield curve provides a broader lens. By plotting interest rates across maturities, it becomes a real-time signal of how investors view growth and inflation. In a normal environment the curve slopes upward — longer-term rates exceed short-term ones, reflecting the uncertainty of time and expectations of growth. When the curve inverts, short-term rates exceed long-term ones, historically one of the most reliable signals of an approaching slowdown.</p>

        {/* Figure 1: Yield Curve SVG */}
        <div className="my-8 border border-gray-200 rounded-xl overflow-hidden bg-white">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Figure 1 — Yield Curve Shapes</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Illustrative; normal vs inverted curve across maturities</p>
          </div>
          <div className="p-5">
            <svg viewBox="0 0 480 200" className="w-full" style={{ fontFamily: "inherit" }}>
              {/* Grid lines */}
              {[0,1,2,3,4,5,6].map(y => (
                <line key={y} x1="48" y1={170 - y * 24} x2="460" y2={170 - y * 24} stroke="#f3f4f6" strokeWidth="1" />
              ))}
              {/* Y axis labels */}
              {[0,1,2,3,4,5,6].map(y => (
                <text key={y} x="42" y={174 - y * 24} textAnchor="end" fontSize="9" fill="#5b6472">{y}%</text>
              ))}
              {/* X axis labels */}
              {["3M","1Y","2Y","5Y","10Y","30Y"].map((label, i) => (
                <text key={label} x={48 + i * 82} y="188" textAnchor="middle" fontSize="9" fill="#3d444d">{label}</text>
              ))}
              {/* Normal curve (green) */}
              <polyline
                points={[
                  [48,  170 - 2.0 * 24],
                  [130, 170 - 2.8 * 24],
                  [212, 170 - 3.4 * 24],
                  [294, 170 - 4.0 * 24],
                  [376, 170 - 4.6 * 24],
                  [458, 170 - 5.0 * 24],
                ].map(p => p.join(",")).join(" ")}
                fill="none" stroke="#059669" strokeWidth="2.5" strokeLinejoin="round"
              />
              {/* Inverted curve (red) */}
              <polyline
                points={[
                  [48,  170 - 5.3 * 24],
                  [130, 170 - 5.0 * 24],
                  [212, 170 - 4.6 * 24],
                  [294, 170 - 4.2 * 24],
                  [376, 170 - 3.9 * 24],
                  [458, 170 - 3.7 * 24],
                ].map(p => p.join(",")).join(" ")}
                fill="none" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="6 3" strokeLinejoin="round"
              />
              {/* Legend */}
              <line x1="56" y1="14" x2="76" y2="14" stroke="#059669" strokeWidth="2.5" />
              <text x="80" y="18" fontSize="10" fill="#374151">Normal (upward sloping) — growth expected</text>
              <line x1="56" y1="30" x2="76" y2="30" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="5 3" />
              <text x="80" y="34" fontSize="10" fill="#374151">Inverted — slowdown signal</text>
            </svg>
          </div>
        </div>

        <p>For credit markets, the shape of the curve is not just academic. A steep curve supports lending and liquidity. An inverted curve tightens financial conditions and increases pressure on borrowers — it is not just a reflection of the economy, it actively influences it.</p>

        <h3 className="font-bold text-[#191c1e] text-base mt-6">Inflation, Central Banks, and the Rate-Credit Tension</h3>
        <p>If the yield curve represents expectations, inflation represents erosion. Fixed income securities are fundamentally exposed to inflation because their cash flows are fixed in nominal terms. When inflation rises, the real value of those payments declines and investors demand higher yields. Yields rise and bond prices fall — quickly. This is why inflation is often described as the silent driver of bond markets.</p>
        <p>Central bank policy interacts directly with this dynamic. When rates fall, existing bonds with higher coupons become more valuable. But rate cuts often occur in response to economic weakness, introducing a second force: rising credit risk. Government bonds may rally while lower-quality credit lags or declines. The balance between rates and credit is what defines performance across different segments of fixed income.</p>
        <p>This tension becomes most acute in stagflation. Inflation remains elevated while growth slows — constraining the usual policy response. Higher inflation pushes yields up, hurting bond prices. Weaker growth widens credit spreads. Unlike typical cycles where one asset class offsets another, stagflation pressures both simultaneously.</p>

        {/* Figure 2: Credit Spread Anatomy */}
        <div className="my-8 border border-gray-200 rounded-xl overflow-hidden bg-white">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Figure 2 — Anatomy of a Bond Yield</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Illustrative yield composition across credit quality</p>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: "US Treasury (Risk-Free)",  riskFree: 100, ig: 0,  hy: 0,  total: "~4.5%", color1: "#3b82f6", note: "Rates only" },
              { label: "Investment Grade Corp.",   riskFree: 72,  ig: 28, hy: 0,  total: "~6.2%", color1: "#3b82f6", color2: "#8b5cf6", note: "+IG spread ~150bp" },
              { label: "High Yield Corp.",         riskFree: 45,  ig: 18, hy: 37, total: "~9.8%", color1: "#3b82f6", color2: "#8b5cf6", note: "+HY spread ~500bp" },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400">{row.note}</span>
                    <span className="text-xs font-bold text-gray-800">{row.total}</span>
                  </div>
                </div>
                <div className="flex h-7 rounded-lg overflow-hidden gap-px">
                  <div style={{ width: `${row.riskFree}%`, backgroundColor: "#3b82f6" }} className="flex items-center justify-center">
                    {row.riskFree > 20 && <span className="text-[9px] font-semibold text-white">Risk-Free Rate</span>}
                  </div>
                  {row.ig > 0 && <div style={{ width: `${row.ig}%`, backgroundColor: "#8b5cf6" }} className="flex items-center justify-center">
                    {row.ig > 15 && <span className="text-[9px] font-semibold text-white">IG Spread</span>}
                  </div>}
                  {row.hy > 0 && <div style={{ width: `${row.hy}%`, backgroundColor: "#ef4444" }} className="flex items-center justify-center">
                    {row.hy > 15 && <span className="text-[9px] font-semibold text-white">HY Spread</span>}
                  </div>}
                </div>
              </div>
            ))}
            <div className="flex gap-4 pt-2">
              {[["#3b82f6","Risk-Free Rate"],["#8b5cf6","IG Credit Spread"],["#ef4444","HY Credit Spread"]].map(([color, label]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <h3 className="font-bold text-[#191c1e] text-base mt-6">Credit Spreads: The Core of Credit Investing</h3>
        <p>At the heart of credit markets lies the credit spread — the additional yield investors demand over a risk-free benchmark. This spread compensates for default risk, liquidity risk, and uncertainty. In stable environments, spreads compress as confidence builds. In stress, they widen sharply. Understanding spreads is critical because they capture what is unique about credit investing. While rates reflect macro conditions, spreads reflect issuer-specific risk and market sentiment. The interplay between the two determines how a bond ultimately performs.</p>
        <p>Fixed income can ultimately be understood as the combination of two forces: rates, driven by inflation and central bank policy; and credit, driven by fundamentals and capital structure. Government bonds are primarily rate-driven. Investment-grade credit reflects a balance of both. High yield is largely credit-driven. The most important question in credit is rarely about a single bond — it is about where you are in the cycle and which force is dominant.</p>
        <p>Fixed income is often framed as a defensive asset class, but that framing understates its role. Credit markets are not just about preserving capital — they are about pricing risk with precision. They often react earlier than equities and provide a clearer signal of where stress is building. If equities reflect optimism about the future, fixed income reflects the cost of being wrong.</p>
      </div>
    ),
  },
  {
    slug: "iran-israel-geopolitical-shock",
    title: "Iran, Israel, and the U.S.: A Geopolitical Shock and Its Transmission Through Markets",
    date: "April 2, 2026",
    tag: "Macro",
    paragraphs: [
      `The conflict between Iran, Israel, and the United States represents a meaningful geopolitical shock with broad implications across macro, equity, and credit markets. Unlike traditional conflicts that primarily affect trade flows or regional demand, this situation transmits through the global economy mainly via energy markets. As tensions escalate, disruptions to oil supply—particularly through critical transit routes like the Strait of Hormuz—have driven a sharp increase in oil prices. This creates an immediate inflationary impulse that feeds into fuel costs, transportation, and ultimately food and core goods pricing, raising the risk of a stagflationary environment characterized by higher inflation and weaker growth.`,
      `From a macro perspective, the most important consequence is the constraint placed on central banks. Higher energy prices push inflation upward at a time when growth is already slowing, limiting the ability of policymakers to ease monetary conditions. This creates a challenging policy tradeoff: cutting rates risks entrenching inflation, while holding rates high exacerbates the slowdown. As a result, financial conditions tighten even without additional policy action, with markets repricing toward higher-for-longer rates and elevated real yields. Historically, this type of environment has been negative for risk assets, as both discount rates rise and growth expectations deteriorate simultaneously.`,
      `Equity markets reflect this dynamic through both direction and rotation. While broad indices tend to sell off in response to heightened geopolitical risk and tighter financial conditions, the more important shift occurs beneath the surface. Energy and defense sectors benefit directly from higher commodity prices and increased government spending, while commodities more broadly act as inflation hedges. In contrast, consumer discretionary sectors face pressure from declining real incomes, and industrials are squeezed by rising input costs. Technology and other long-duration assets are particularly vulnerable due to their sensitivity to higher discount rates. The net effect is not necessarily a uniform bear market, but rather a regime shift in leadership toward inflation beneficiaries and defensive sectors, accompanied by downward pressure on overall valuation multiples and earnings expectations.`,
      `The implications for credit markets are more subtle but potentially more severe. Higher rates increase the cost of servicing debt at the same time that economic growth—and therefore corporate earnings—comes under pressure. This combination weakens credit fundamentals, particularly for highly leveraged borrowers. At the same time, risk aversion reduces the availability of capital, making refinancing more difficult. This is especially problematic given the large cohort of companies that issued debt in the low-rate environment of 2020 to 2022 and now face a refinancing wall at significantly higher coupons. Public high yield and leveraged loan markets may see widening spreads and rising default expectations, but the greater risk may lie in private credit, where valuations are less transparent and adjustments to stress can be delayed.`,
      `Taken together, the transmission mechanism from geopolitics to markets follows a clear chain: conflict drives an energy shock, which feeds into inflation, constrains monetary policy, tightens financial conditions, and ultimately slows growth. This sequence creates simultaneous pressure on equities through both earnings and valuation channels, and on credit through deteriorating fundamentals and reduced liquidity. The result is a macro environment that increasingly resembles stagflation, a regime that has historically been challenging for both traditional risk assets and leveraged strategies.`,
      `Ultimately, the key risk for investors is mischaracterizing the conflict as a short-term volatility event rather than a structural shift. While markets may initially react to headlines, the more durable impact comes from second-order effects on inflation expectations, interest rates, and credit conditions. If energy disruptions persist, the conflict has the potential not only to delay the easing cycle but also to catalyze a broader credit cycle turn. In that sense, the most important takeaway is not the immediate move in oil prices, but the tightening of financial conditions that follows and its cascading effects across asset classes.`,
    ],
  },
  {
    slug: "co-op-vs-rsa",
    title: "Co-op Agreements vs. Restructuring Support Agreements (RSA)",
    date: "March 26, 2026",
    tag: "Credit",
    paragraphs: [
      `Cooperation agreements ("Co-ops") and Restructuring Support Agreements (RSAs) are both commonly used in debt restructurings, but they serve distinct purposes and typically arise at different stages of a transaction.`,
      `Co-ops are generally agreements among creditors only and are most often used in the early stages of a situation. At this point, the company is typically not yet formally involved, and creditors use the agreement to coordinate strategy and present a unified negotiating position. These agreements are contractually binding among participating creditors and usually cover cooperation mechanics, cost sharing, information exchange, and economic incentives that differentiate early participants from those who join later. Co-ops also frequently include transfer restrictions, requiring any buyer of the debt to accede to the agreement, thereby preserving alignment within the creditor group.`,
      `In contrast, RSAs are entered into between the company and key creditor constituencies once a restructuring framework has largely been agreed. RSAs carry stronger legal weight and set out the terms of the proposed transaction in detail, including capital structure outcomes, treatment of various creditor classes, voting commitments, and key milestones. Their primary function is to lock in support from major stakeholders and provide execution certainty ahead of a formal restructuring process.`,
      `In practice, Co-ops function as a coordination tool during the negotiation phase, while RSAs represent a more definitive agreement that underpins transaction execution, often in the lead-up to or during a Chapter 11 process.`,
    ],
  },
];

export const TAG_STYLES: Record<string, string> = {
  "Macro":        "bg-amber-100 text-amber-700",
  "Credit":       "bg-sky-100 text-sky-700",
  "Equity":       "bg-emerald-100 text-emerald-700",
  "Tech / AI":    "bg-indigo-100 text-indigo-700",
  "Interview Prep": "bg-violet-100 text-violet-700",
  "Career Prep":  "bg-violet-100 text-violet-700",
  "Commodities":  "bg-orange-100 text-orange-700",
  "Real Estate":  "bg-teal-100 text-teal-700",
  "Fund Letters": "bg-rose-100 text-rose-700",
  "Private Credit": "bg-emerald-100 text-emerald-700",
};

export function getAllPosts(): InsightPost[] {
  return [...INDUSTRY_POSTS, ...CAREER_POSTS];
}

export function getPostBySlug(slug: string): InsightPost | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}

