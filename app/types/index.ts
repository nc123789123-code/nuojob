// ─── Core domain types ────────────────────────────────────────────────────────

export type FundingStage =
  | "pre_seed"
  | "seed"
  | "series_a"
  | "series_b"
  | "series_c"
  | "growth"
  | "unknown";

export type FundStrategy =
  | "private_credit"
  | "special_sits"
  | "direct_lending"
  | "hedge_fund"
  | "long_short"
  | "macro"
  | "quant"
  | "multi_strategy"
  | "distressed"
  | "mezzanine"
  | "other";

export type RaiseBucket = "hot" | "warm" | "watch" | "low";
export type ConfidenceLevel = "high" | "medium" | "low";
export type OfferingStatus = "open" | "closed" | "unknown";

// ─── Signal ───────────────────────────────────────────────────────────────────

export type SignalType =
  | "form_d_new"
  | "form_d_amendment"
  | "form_d_open"
  | "form_d_closed"
  | "large_offering"
  | "near_target"
  | "press_release"
  | "hiring_investing"
  | "hiring_ir"
  | "hiring_ops"
  | "new_senior_hire"
  | "expansion";

export interface Signal {
  type: SignalType;
  description: string;
  date: string;
  source: "SEC EDGAR" | "Press Release" | "Careers Page" | "News";
  weight: number; // contribution to score
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export interface FundScore {
  fundraisingScore: number; // 0–100
  hiringScore: number; // 0–100 (placeholder in MVP)
  expansionScore: number; // 0–100 (placeholder in MVP)
  recencyMultiplier: number; // 0.1–1.0
  overallScore: number; // 0–100
  bucket: RaiseBucket;
  confidence: ConfidenceLevel;
  whyNow: string[];
  suggestedAngle: string;
  suggestedTargetTeams: string[];
  signals: Signal[];
}

// ─── Fund filing (from EDGAR Form D) ──────────────────────────────────────────

export interface FundFiling {
  id: string;
  entityName: string;
  cik: string;
  fileDate: string;
  formType: string;
  accessionNo: string;
  strategy: FundStrategy;
  strategyLabel: string;
  // From Form D XML
  totalOfferingAmount?: number;
  totalAmountSold?: number;
  offeringStatus: OfferingStatus;
  minimumInvestment?: number;
  state?: string;
  dateOfFirstSale?: string;
  revenueRange?: string;
  relatedPersons?: RelatedPerson[];
  // Computed
  score: FundScore;
  daysSinceFiling: number;
}

export interface RelatedPerson {
  firstName?: string;
  lastName?: string;
  title?: string;
  city?: string;
  state?: string;
}

// ─── Search / UI ──────────────────────────────────────────────────────────────

export interface SearchFilters {
  query: string;
  strategy: "all" | FundStrategy;
  dateRange: "30" | "60" | "90" | "180";
  bucket: "all" | RaiseBucket;
  minAmount: string;
}

export interface OutreachRecord {
  filingId: string;
  entityName: string;
  strategy: string;
  status: "not_contacted" | "reached_out" | "in_discussion" | "passed";
  notes: string;
  contactedAt?: string;
  score?: number;
}

// ─── Startup filing (EDGAR Form D equity raises) ──────────────────────────────

export interface StartupScore {
  fundingScore: number;    // 0–100 based on recency + size
  hiringScore: number;     // 0–100 (placeholder Phase 2)
  expansionScore: number;  // 0–100 (NewsAPI)
  recencyMultiplier: number;
  overallScore: number;    // 0–100
  bucket: RaiseBucket;
  confidence: ConfidenceLevel;
  whyNow: string[];
  suggestedAngle: string;
  signals: Signal[];
  stage: FundingStage;
  stageLabel: string;
}

export interface StartupFiling {
  id: string;
  entityName: string;
  cik: string;
  fileDate: string;
  formType: string;
  accessionNo: string;
  stage: FundingStage;
  stageLabel: string;
  // From Form D XML
  totalOfferingAmount?: number;
  totalAmountSold?: number;
  offeringStatus: OfferingStatus;
  state?: string;
  dateOfFirstSale?: string;
  relatedPersons?: RelatedPerson[];
  // Computed
  score: StartupScore;
  daysSinceFiling: number;
}

export interface StartupSearchFilters {
  query: string;
  stage: "all" | FundingStage;
  dateRange: "30" | "60" | "90" | "180";
  bucket: "all" | RaiseBucket;
  minAmount: string;
}

// ─── EDGAR raw types ──────────────────────────────────────────────────────────

export interface EdgarSearchHit {
  _id: string;
  _source: {
    // Actual EDGAR EFTS field names
    display_names?: string[];
    entity_name?: string; // fallback, older format
    ciks?: string[];
    adsh?: string;
    file_date: string;
    form?: string;
    file_type?: string;
    form_type?: string;
    biz_locations?: string[];
    biz_states?: string[];
    file_num?: string[];
  };
}
