"""
Task 1: Entity Resolution
-------------------------
Normalises raw Form D filer names (e.g. "Blue Owl Capital Partners VIII LP")
to clean parent manager names ("Blue Owl Capital").

Outputs an EntityMatch with:
  - manager_name   canonical parent manager name
  - raw_name       original string from EDGAR
  - normalized     intermediate cleaned string
  - confidence     "high" | "medium" | "low"
  - review_flag    True when match is ambiguous and needs human review
  - match_score    0–1 similarity score (1 = exact dict hit)
"""

import re
import json
import logging
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ── Canonical manager dictionary ───────────────────────────────────────────────
# Maps lower-cased partial/normalized names → canonical parent manager.
# Keys are matched as substrings of the cleaned fund name (after suffix stripping),
# longest key wins on ties.

KNOWN_MANAGERS: dict[str, str] = {
    # Private credit mega-platforms
    "ares management":          "Ares Management",
    "ares capital":             "Ares Management",    # BDC — parent is Ares
    "ares":                     "Ares Management",
    "apollo global management": "Apollo Global Management",
    "apollo global":            "Apollo Global Management",
    "apollo credit":            "Apollo Global Management",
    "apollo investment":        "Apollo Global Management",
    "apollo":                   "Apollo Global Management",
    "oaktree capital":          "Oaktree Capital Management",
    "oaktree opportunities":    "Oaktree Capital Management",
    "oaktree":                  "Oaktree Capital Management",
    "blackstone credit":        "Blackstone Credit",
    "blackstone secured":       "Blackstone Credit",
    "blackstone alternative":   "Blackstone Credit",
    "blackstone":               "Blackstone Credit",
    "hps investment":           "HPS Investment Partners",
    "hps mezzanine":            "HPS Investment Partners",
    "hps":                      "HPS Investment Partners",
    "kkr credit":               "KKR Credit",
    "kkr":                      "KKR Credit",
    "centerbridge special":     "Centerbridge Partners",
    "centerbridge credit":      "Centerbridge Partners",
    "centerbridge":             "Centerbridge Partners",
    "blue owl capital":         "Blue Owl Capital",
    "blue owl":                 "Blue Owl Capital",
    "owl rock":                 "Blue Owl Capital",   # pre-merger brand
    # Specialist credit
    "bain capital credit":      "Bain Capital Credit",
    "bain capital special":     "Bain Capital Credit",
    "bain capital":             "Bain Capital Credit",
    "monarch alternative":      "Monarch Alternative Capital",
    "monarch debt":             "Monarch Alternative Capital",
    "monarch":                  "Monarch Alternative Capital",
    "avenue capital":           "Avenue Capital Group",
    "avenue":                   "Avenue Capital Group",
    "silver point":             "Silver Point Capital",
    "silverpoint":              "Silver Point Capital",
    "marathon asset":           "Marathon Asset Management",
    "marathon credit":          "Marathon Asset Management",
    "marathon":                 "Marathon Asset Management",
    "brigade capital":          "Brigade Capital Management",
    "brigade leveraged":        "Brigade Capital Management",
    "brigade":                  "Brigade Capital Management",
    "king street":              "King Street Capital",
    "mudrick capital":          "Mudrick Capital Management",
    "mudrick":                  "Mudrick Capital Management",
    "tpg angelo gordon":        "TPG Angelo Gordon",
    "angelo gordon":            "TPG Angelo Gordon",
    "tpg specialty":            "TPG Angelo Gordon",
    "carlyle credit":           "Carlyle Credit",
    "carlyle secured":          "Carlyle Credit",
    "carlyle":                  "Carlyle Credit",
    "benefit street":           "Benefit Street Partners",
    "antares capital":          "Antares Capital",
    "antares":                  "Antares Capital",
    "golub capital":            "Golub Capital",
    "golub":                    "Golub Capital",
    "magnetar capital":         "Magnetar Capital",
    "magnetar":                 "Magnetar Capital",
    "first eagle alternative":  "First Eagle Alternative Capital",
    "first eagle":              "First Eagle Alternative Capital",
    "neuberger berman":         "Neuberger Berman Credit",
    "neuberger":                "Neuberger Berman Credit",
    "silver lake credit":       "Silver Lake Credit",
    "silver lake":              "Silver Lake Credit",
    "tpg capital":              "TPG Capital",
    "tpg":                      "TPG Capital",
    "millennium management":    "Millennium Management",
    "millennium":               "Millennium Management",
    "warburg pincus":           "Warburg Pincus",
    "warburg":                  "Warburg Pincus",
    # Additional common private credit managers
    "golub direct":             "Golub Capital",
    "owl rock capital":         "Blue Owl Capital",
    "tcg bdc":                  "Carlyle Credit",
    "tcg":                      "Carlyle Credit",
    "benefit street franklin":  "Benefit Street Partners",
    "fsl":                      "First Eagle Alternative Capital",
    "bain credit":              "Bain Capital Credit",
    "peninsula":                "Benefit Street Partners",  # BSP rebranding
}

# ── Suffix patterns stripped from raw names ────────────────────────────────────

_ROMAN  = r"(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})"   # I–XCIX (covers most fund sequences)
_SEQNUM = rf"(?:{_ROMAN}|\d+(?:st|nd|rd|th)?|[A-Z])"  # roman | "4th" | "B"

# Ordered: strip longest / most specific patterns first
_STRIP_PATTERNS = [
    # Legal entity suffixes
    r",?\s+L\.?L\.?C\.?$",
    r",?\s+L\.?P\.?$",
    r",?\s+Ltd\.?$",
    r",?\s+Limited$",
    r",?\s+Inc\.?$",
    r",?\s+Corp\.?$",
    r",?\s+PLC$",
    # Geographic qualifiers (these are fund-vehicle markers, not manager names)
    r"\s+\((?:Cayman|Ireland|Luxembourg|Delaware|Offshore|Onshore|Parallel|Feeder)\)$",
    r"\s+(?:Cayman|Offshore|Onshore|Feeder|Parallel|Co-?Invest(?:ment)?)$",
    # Fund sequence: "Fund VIII", "Opportunities XI", "Partners IV"
    rf"\s+(?:Fund|Opportunities?|Solutions?|Investments?)\s+{_SEQNUM}$",
    rf"\s+{_SEQNUM}(?:\s+[A-Z])?$",   # trailing "VIII B", "4 C"
    # Fund-type nouns (usually come after sequence)
    r"\s+(?:Senior\s+)?(?:Secured|Credit|Debt|Equity|Loan|Lending|Capital|Partners?)\s*$",
    # Unlimited company (Irish form)
    r"\s+Unlimited\s+Company$",
    # BDC Inc. pattern (e.g. "Ares Capital Corporation")
    r"\s+(?:Corporation|Company)$",
]

_STRIP_RE = [re.compile(p, re.IGNORECASE) for p in _STRIP_PATTERNS]


def _strip_suffixes(name: str) -> str:
    """Iteratively strip fund-vehicle suffixes from a raw filer name."""
    cleaned = name.strip()
    prev = None
    # Repeat until stable (some names have multiple layers to strip)
    while cleaned != prev:
        prev = cleaned
        for pattern in _STRIP_RE:
            cleaned = pattern.sub("", cleaned).strip()
        # Strip trailing punctuation
        cleaned = re.sub(r"[,\.\s]+$", "", cleaned).strip()
    return cleaned


def _normalize(name: str) -> str:
    """Return lower-cased, whitespace-collapsed version of a stripped name."""
    return re.sub(r"\s+", " ", _strip_suffixes(name)).lower().strip()


def _dict_lookup(normalized: str) -> Optional[tuple[str, float]]:
    """
    Try to match against KNOWN_MANAGERS.
    Returns (canonical_name, score) or None.
    Scores: 1.0 = exact; 0.9 = longest key is substring.
    """
    # Exact match
    if normalized in KNOWN_MANAGERS:
        return KNOWN_MANAGERS[normalized], 1.0

    # Substring match — longest key wins to avoid over-broad matches
    matches = [
        (key, val) for key, val in KNOWN_MANAGERS.items()
        if key in normalized
    ]
    if matches:
        best_key, best_val = max(matches, key=lambda kv: len(kv[0]))
        # Score slightly below 1.0; longer key = more confident
        score = min(0.95, 0.7 + 0.05 * len(best_key))
        return best_val, score

    # Reverse: normalized is a substring of a key (handles very short cleaned names)
    rev_matches = [
        (key, val) for key, val in KNOWN_MANAGERS.items()
        if normalized in key and len(normalized) > 4
    ]
    if rev_matches:
        best_key, best_val = min(rev_matches, key=lambda kv: len(kv[0]))
        return best_val, 0.75

    return None


def _fuzzy_match(normalized: str, threshold: float = 0.72) -> Optional[tuple[str, float]]:
    """
    Fuzzy match normalized name against all KNOWN_MANAGERS keys.
    Returns best (canonical_name, score) above threshold, else None.
    """
    best_score = 0.0
    best_val   = None
    for key, val in KNOWN_MANAGERS.items():
        ratio = SequenceMatcher(None, normalized, key).ratio()
        if ratio > best_score:
            best_score = ratio
            best_val   = val
    if best_score >= threshold and best_val:
        return best_val, best_score
    return None


# ── Public dataclass ───────────────────────────────────────────────────────────

@dataclass
class EntityMatch:
    raw_name:     str
    normalized:   str
    manager_name: Optional[str]
    confidence:   str           # "high" | "medium" | "low"
    match_score:  float         # 0–1
    review_flag:  bool          # True → needs human review
    match_method: str           # "dict_exact" | "dict_substr" | "fuzzy" | "none"

    def is_usable(self) -> bool:
        """Return True if this match can be used downstream without review."""
        return self.confidence in ("high", "medium") and self.manager_name is not None


# ── Resolver ───────────────────────────────────────────────────────────────────

class EntityResolver:
    """
    Resolves raw Form D filer names to canonical parent manager names.

    Maintains a growing lookup of previously resolved names (persisted to
    pipeline/cache/entity_cache.json) to avoid re-processing known names.
    """

    CACHE_PATH = Path(__file__).parent / "cache" / "entity_cache.json"

    def __init__(self):
        self._cache: dict[str, dict] = {}
        self._load_cache()

    def _load_cache(self):
        if self.CACHE_PATH.exists():
            try:
                self._cache = json.loads(self.CACHE_PATH.read_text())
            except (json.JSONDecodeError, OSError):
                self._cache = {}

    def _save_cache(self):
        try:
            self.CACHE_PATH.write_text(json.dumps(self._cache, indent=2))
        except OSError as exc:
            logger.warning("Could not save entity cache: %s", exc)

    def resolve(self, raw_name: str) -> EntityMatch:
        """Resolve a single raw filer name."""
        if raw_name in self._cache:
            d = self._cache[raw_name]
            return EntityMatch(**d)

        normalized = _normalize(raw_name)

        # 1. Dictionary lookup (highest confidence)
        result = _dict_lookup(normalized)
        if result:
            canonical, score = result
            method = "dict_exact" if score == 1.0 else "dict_substr"
            confidence = "high" if score >= 0.9 else "medium"
            match = EntityMatch(
                raw_name=raw_name, normalized=normalized,
                manager_name=canonical, confidence=confidence,
                match_score=score, review_flag=False,
                match_method=method,
            )
            self._cache[raw_name] = match.__dict__
            self._save_cache()
            return match

        # 2. Fuzzy fallback
        result = _fuzzy_match(normalized)
        if result:
            canonical, score = result
            confidence  = "medium" if score >= 0.82 else "low"
            review_flag = score < 0.82
            match = EntityMatch(
                raw_name=raw_name, normalized=normalized,
                manager_name=canonical, confidence=confidence,
                match_score=round(score, 3), review_flag=review_flag,
                match_method="fuzzy",
            )
            self._cache[raw_name] = match.__dict__
            self._save_cache()
            return match

        # 3. No match — use stripped name as best guess, flag for review
        fallback = _strip_suffixes(raw_name) or raw_name
        match = EntityMatch(
            raw_name=raw_name, normalized=normalized,
            manager_name=fallback if fallback != raw_name else None,
            confidence="low", match_score=0.0,
            review_flag=True, match_method="none",
        )
        self._cache[raw_name] = match.__dict__
        self._save_cache()
        logger.warning("LOW CONFIDENCE / REVIEW NEEDED: %r → %r", raw_name, fallback)
        return match

    def resolve_batch(self, raw_names: list[str]) -> list[EntityMatch]:
        """Resolve a list of raw filer names."""
        return [self.resolve(n) for n in raw_names]

    def add_manual_override(self, raw_name: str, canonical: str):
        """Manually add / override a resolution (persisted to cache)."""
        norm = _normalize(raw_name)
        match = EntityMatch(
            raw_name=raw_name, normalized=norm,
            manager_name=canonical, confidence="high",
            match_score=1.0, review_flag=False,
            match_method="manual",
        )
        self._cache[raw_name] = match.__dict__
        self._save_cache()
        logger.info("Manual override added: %r → %r", raw_name, canonical)


# ── CLI helper ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    resolver = EntityResolver()
    samples = sys.argv[1:] or [
        "Blue Owl Capital Partners VIII LP",
        "Ares Capital Corporation",
        "Apollo Investment Fund IX, L.P.",
        "Oaktree Opportunities Fund XI (Cayman), L.P.",
        "HPS Mezzanine Partners IV, L.P.",
        "KKR Credit Advisors (Ireland) Unlimited Company",
        "Centerbridge Special Credit Partners III, L.P.",
        "Golub Capital BDC 3, Inc.",
        "Totally Unknown Fund Manager II LP",
    ]
    for s in samples:
        m = resolver.resolve(s)
        flag = " ⚠ REVIEW" if m.review_flag else ""
        print(f"{m.confidence:6s} [{m.match_score:.2f}] {m.raw_name!r:55s} → {m.manager_name!r}{flag}")
