/**
 * Firm Registry — canonical list of buy-side finance firms with ATS metadata.
 *
 * Only include validated ATS slugs. Any slug that returns HTTP 404 from the
 * respective API will be silently dropped by Promise.allSettled in the scrapers.
 *
 * Strategies use the same identifiers as FundStrategy in types/index.ts, plus
 * "growth" and "equity" as aliases for growth equity and long-only equity.
 */

export type FirmTier = 1 | 2 | 3;

export interface FirmProfile {
  id: string;
  name: string;
  /** Primary investment strategies this firm is known for */
  strategies: string[];
  /** 1 = mega-fund / household name, 2 = major firm, 3 = mid-market / boutique */
  tier: FirmTier;
  /** Greenhouse job board slug → boards.greenhouse.io/{slug}/jobs.json */
  greenhouse?: string;
  /** Lever job board slug → api.lever.co/v0/postings/{slug} */
  lever?: string;
  /** Ashby job board slug → api.ashbyhq.com/posting-api/job-board/{slug} */
  ashby?: string;
}

export const FIRMS: FirmProfile[] = [
  // ── Tier 1: Mega-funds ─────────────────────────────────────────────────────
  {
    id: "kkr",
    name: "KKR",
    strategies: ["private_credit", "private_equity", "real_assets"],
    tier: 1,
    greenhouse: "kkr",
  },
  {
    id: "ares",
    name: "Ares Management",
    strategies: ["private_credit", "direct_lending", "special_sits"],
    tier: 1,
    greenhouse: "aresmgmt",
  },
  {
    id: "point72",
    name: "Point72",
    strategies: ["multi_strategy", "long_short", "quant"],
    tier: 1,
    greenhouse: "point72",
  },
  {
    id: "millennium",
    name: "Millennium Management",
    strategies: ["multi_strategy"],
    tier: 1,
    greenhouse: "millenniummanagement",
  },
  {
    id: "bridgewater",
    name: "Bridgewater Associates",
    strategies: ["macro"],
    tier: 1,
    greenhouse: "bridgewater89",
  },
  {
    id: "aqr",
    name: "AQR Capital Management",
    strategies: ["quant", "multi_strategy", "macro"],
    tier: 1,
    greenhouse: "aqr",
  },
  {
    id: "hps",
    name: "HPS Investment Partners",
    strategies: ["private_credit", "special_sits", "distressed"],
    tier: 1,
    greenhouse: "hpsinvestmentpartners",
  },
  {
    id: "generalatlantic",
    name: "General Atlantic",
    strategies: ["growth", "private_equity"],
    tier: 1,
    greenhouse: "generalatlantic",
  },
  {
    id: "silverlake",
    name: "Silver Lake",
    strategies: ["private_equity", "private_credit", "growth"],
    tier: 1,
    greenhouse: "silverlake",
  },
  {
    id: "tpg",
    name: "TPG Capital",
    strategies: ["private_equity", "private_credit", "growth"],
    tier: 1,
    greenhouse: "tpg",
  },

  // ── Tier 2: Major firms (credit / special sits) ───────────────────────────
  {
    id: "blueowl",
    name: "Blue Owl Capital",
    strategies: ["direct_lending", "private_credit"],
    tier: 2,
    greenhouse: "blueowl",
  },
  {
    id: "golubcapital",
    name: "Golub Capital",
    strategies: ["direct_lending", "private_credit"],
    tier: 2,
    greenhouse: "golubcapital",
  },
  {
    id: "warburgpincus",
    name: "Warburg Pincus",
    strategies: ["private_equity", "growth"],
    tier: 2,
    greenhouse: "warburgpincusllc",
  },
  {
    id: "insightpartners",
    name: "Insight Partners",
    strategies: ["growth", "private_equity"],
    tier: 2,
    greenhouse: "insightpartners",
  },
  {
    id: "neuberger",
    name: "Neuberger Berman",
    strategies: ["multi_strategy", "private_credit", "equity"],
    tier: 2,
    greenhouse: "neubergerberman",
  },

  // ── Tier 2: Major firms (hedge / multi-strat) — Lever ────────────────────
  {
    id: "coatue",
    name: "Coatue Management",
    strategies: ["hedge_fund", "long_short", "growth"],
    tier: 2,
    lever: "coatue",
  },
  {
    id: "tigerglobal",
    name: "Tiger Global",
    strategies: ["hedge_fund", "growth"],
    tier: 2,
    lever: "tigerglobal",
  },
  {
    id: "iconiq",
    name: "ICONIQ Capital",
    strategies: ["private_equity", "growth"],
    tier: 2,
    lever: "iconiqcapital",
  },
  {
    id: "dragoneer",
    name: "Dragoneer Investment Group",
    strategies: ["growth", "hedge_fund"],
    tier: 2,
    lever: "dragoneer",
  },
  {
    id: "d1capital",
    name: "D1 Capital Partners",
    strategies: ["hedge_fund", "long_short"],
    tier: 2,
    lever: "d1capitalpartners",
  },

  // ── Tier 2: Ashby firms ───────────────────────────────────────────────────
  {
    id: "magnetar",
    name: "Magnetar Capital",
    strategies: ["distressed", "special_sits", "quant"],
    tier: 2,
    ashby: "magnetar",
  },
];

/**
 * Lookup a FirmProfile by name (case-insensitive, partial match).
 * Used by the intel route to cross-reference job source with EDGAR.
 */
export function findFirmByName(name: string): FirmProfile | undefined {
  const lower = name.toLowerCase();
  return FIRMS.find(
    (f) =>
      lower.includes(f.name.toLowerCase()) ||
      f.name.toLowerCase().includes(lower)
  );
}

/**
 * All Greenhouse slugs in [slug, firm] pairs.
 */
export function getGreenhouseFirms(): Array<{ slug: string; firm: string; strategies: string[]; tier: FirmTier }> {
  return FIRMS.filter((f) => f.greenhouse).map((f) => ({
    slug: f.greenhouse!,
    firm: f.name,
    strategies: f.strategies,
    tier: f.tier,
  }));
}

/**
 * All Lever slugs.
 */
export function getLeverFirms(): Array<{ slug: string; firm: string; strategies: string[]; tier: FirmTier }> {
  return FIRMS.filter((f) => f.lever).map((f) => ({
    slug: f.lever!,
    firm: f.name,
    strategies: f.strategies,
    tier: f.tier,
  }));
}

/**
 * All Ashby slugs.
 */
export function getAshbyFirms(): Array<{ slug: string; firm: string; strategies: string[]; tier: FirmTier }> {
  return FIRMS.filter((f) => f.ashby).map((f) => ({
    slug: f.ashby!,
    firm: f.name,
    strategies: f.strategies,
    tier: f.tier,
  }));
}
