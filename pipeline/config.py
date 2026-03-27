"""
Shared configuration for the Onlu data pipeline.
"""
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────

ROOT        = Path(__file__).parent
CACHE_DIR   = ROOT / "cache"
EDGAR_CACHE = CACHE_DIR / "edgar"
JOBS_CACHE  = CACHE_DIR / "jobs"
OUTPUT_DIR  = ROOT / "output"
LOGS_DIR    = ROOT / "logs"

for _d in (EDGAR_CACHE, JOBS_CACHE, OUTPUT_DIR, LOGS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ── EDGAR API ─────────────────────────────────────────────────────────────────

EDGAR_HEADERS = {
    "User-Agent": "Onlu/1.0 research@onlu.com",
    "Accept":     "application/json, text/xml",
}
EDGAR_SEARCH_URL  = "https://efts.sec.gov/LATEST/search-index"
EDGAR_ARCHIVE_URL = "https://www.sec.gov/Archives/edgar/data"
EDGAR_SUBMISSIONS = "https://data.sec.gov/submissions"

# Full-text search terms that surface private-credit / special-sits Form D filers
EDGAR_QUERIES = [
    "private credit",
    "direct lending",
    "special situations",
    "distressed debt",
    "mezzanine",
    "collateralized loan obligation",
    "business development company",
    "credit opportunities",
]

# ── Cache TTLs (seconds) ──────────────────────────────────────────────────────

EDGAR_CACHE_TTL = 86_400        # 24 hours
JOBS_CACHE_TTL  = 172_800       # 48 hours
ADV_CACHE_TTL   = 604_800       # 7 days
NEWS_CACHE_TTL  = 14_400        # 4 hours

# ── Signal scoring weights ─────────────────────────────────────────────────────

SCORE_WEIGHTS = {
    "recency":    0.35,   # days since filing
    "raise_size": 0.30,   # total offering amount
    "new_fund":   0.20,   # first-time vs re-up
    "jobs_posted":0.15,   # open roles already visible
}

RAISE_TIERS = [
    (1_000_000_000, 10),   # ≥ $1B
    (500_000_000,    8),   # ≥ $500M
    (250_000_000,    6),   # ≥ $250M
    (100_000_000,    4),   # ≥ $100M
    (50_000_000,     2),   # ≥ $50M
    (10_000_000,     1),   # ≥ $10M  (minimum threshold)
]

RECENCY_TIERS = [
    (7,   10),    # ≤ 7 days
    (14,   8),    # ≤ 14 days
    (30,   6),    # ≤ 30 days
    (60,   4),    # ≤ 60 days
    (90,   2),    # ≤ 90 days
]

# ── Strategy keyword patterns (applied to fund name + description) ─────────────

STRATEGY_PATTERNS = {
    "Direct Lending":    [
        r"\bdirect\s+lend", r"\bsenior\s+secured", r"\bunitranche",
        r"\bfirst\s+lien", r"\bBDC\b", r"\bbusiness\s+development",
        r"\bloan\s+fund", r"\bmiddle\s+market", r"\bsponsored\s+finance",
    ],
    "Distressed":        [
        r"\bdistressed", r"\brecovery", r"\bdislocation",
        r"\bnon-performing", r"\bturnaround",
    ],
    "Special Situations":[
        r"\bspecial\s+sit", r"\bspecial\s+opportunity",
        r"\bevent.driven", r"\bopportunistic\s+credit",
        r"\brescue\s+financ",
    ],
    "Mezzanine":         [
        r"\bmezzanine", r"\bmezz\b", r"\bjunior\s+(?:secured|debt)",
        r"\bsubordinated", r"\bsecond\s+lien",
    ],
    "CLO":               [
        r"\bCLO\b", r"\bcollateralized\s+loan", r"\bCDO\b",
        r"\blocal\s+currency.*obligat",
    ],
    "Real Estate Credit":[
        r"\breal\s+estate\s+(?:credit|debt|lend|mort)",
        r"\bCMBS", r"\bmortgage", r"\bproperty\s+(?:debt|credit)",
    ],
    "High Yield":        [
        r"\bhigh\s+yield", r"\bjunk\s+bond", r"\bleverage[d]?\s+loan",
        r"\bfixed\s+income\s+(?:opport|value)",
    ],
    "Multi-Strategy":    [
        r"\bmulti.strateg", r"\bdiversified\s+credit",
        r"\bopportunistic(?!\s+credit)",   # catch-all opport without "credit"
        r"\balternative\s+credit",
    ],
}

# ── Filters ───────────────────────────────────────────────────────────────────

MIN_RAISE_AMOUNT = 10_000_000   # $10M floor

EXCLUDE_PATTERNS = [
    r"\breal\s+estate\s+(?:operating|REIT|develop|invest)",  # RE operating co
    r"\blaw\s+(firm|office)\b",
    r"\battorneys?\s+at\s+law\b",
    r"\bpension\s+plan\b",
    r"\bfamily\s+(?:office|trust|wealth)",
    r"\bchurch\b", r"\bcharity\b", r"\bfoundation\b",
    r"\bsingle\s+(?:family|asset|purpose)",
    r"\bSPAC\b", r"\bblank\s+check",
]

FUND_REQUIRED_PATTERNS = [
    r"\bfund\b", r"\bLP\b", r"\bL\.P\.\b", r"\bpartners\b",
    r"\bcredit\b", r"\bcapital\b", r"\bopportunities\b",
    r"\bmanagement\b", r"\bhedge\b", r"\binvestment\b",
    r"\blending\b", r"\bBDC\b", r"\bCLO\b",
]

# ── Job classification ────────────────────────────────────────────────────────

JOB_FUNCTIONS = {
    "Investment":         [
        r"\b(credit|portfolio|investment|deal|underwriting)\s+(analyst|associate|professional|officer|manager)\b",
        r"\b(analyst|associate|vice president|director|managing director|partner)\b.*\b(credit|private|distressed|lending|special)\b",
        r"\bportfolio\s+manager\b",
    ],
    "Portfolio Monitoring":[
        r"\bportfolio\s+monitor", r"\bportfolio\s+management\b",
        r"\bcovenant\s+compliance", r"\bborrower\s+monitor",
        r"\bworkout\b", r"\brestructur",
    ],
    "IR / Fundraising":   [
        r"\binvestor\s+relation", r"\bfundraising\b",
        r"\bclient\s+relation", r"\bcapital\s+formation",
        r"\bmarketing.*fund", r"\bLimited\s+Partner",
    ],
    "Legal / Compliance": [
        r"\bcounsel\b", r"\bcompliance\b", r"\blegal\b",
        r"\bregulatory\b", r"\bparalegal\b",
    ],
    "Operations":         [
        r"\bfund\s+oper", r"\btrade\s+oper", r"\bback\s+office",
        r"\bmiddle\s+office", r"\bfinance\s+oper",
        r"\baccounting\b", r"\bcontroller\b",
    ],
}

# ── HTTP request defaults ─────────────────────────────────────────────────────

REQUEST_TIMEOUT = 10    # seconds
REQUEST_RETRIES = 2
