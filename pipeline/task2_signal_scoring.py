"""
Task 2: Fundraising Signal Scoring
------------------------------------
Fetches Form D filings from SEC EDGAR, parses key fields, infers strategy,
and scores each filing as a hiring signal (1–10).

Score components (see config.SCORE_WEIGHTS):
  - Recency:    how many days since the filing
  - Raise size: total offering amount
  - New fund:   first-time vehicle vs amendment/re-up (Form D vs D/A)
  - Jobs posted: bonus if open roles already found at this manager
"""

import json
import logging
import re
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import urllib.request
import urllib.error

from config import (
    EDGAR_HEADERS, EDGAR_SEARCH_URL, EDGAR_ARCHIVE_URL,
    EDGAR_QUERIES, EDGAR_CACHE, EDGAR_CACHE_TTL,
    MIN_RAISE_AMOUNT, EXCLUDE_PATTERNS, FUND_REQUIRED_PATTERNS,
    STRATEGY_PATTERNS, RAISE_TIERS, RECENCY_TIERS, SCORE_WEIGHTS,
    REQUEST_TIMEOUT, REQUEST_RETRIES,
)

logger = logging.getLogger(__name__)


# ── HTTP helper ────────────────────────────────────────────────────────────────

def _get(url: str, headers: Optional[dict] = None, retries: int = REQUEST_RETRIES) -> Optional[bytes]:
    """Simple HTTP GET with retry. Returns bytes or None on failure."""
    hdrs = {**EDGAR_HEADERS, **(headers or {})}
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=hdrs)
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
                return resp.read()
        except urllib.error.HTTPError as exc:
            logger.debug("HTTP %d on %s (attempt %d)", exc.code, url, attempt + 1)
            if exc.code in (403, 404):
                return None   # not worth retrying
        except Exception as exc:
            logger.debug("Error fetching %s (attempt %d): %s", url, attempt + 1, exc)
        if attempt < retries:
            time.sleep(1.5 ** attempt)
    return None


# ── EDGAR caching ──────────────────────────────────────────────────────────────

def _cache_path(key: str) -> Path:
    safe = re.sub(r"[^\w\-]", "_", key)
    return EDGAR_CACHE / f"{safe}.json"


def _load_cache(key: str) -> Optional[dict]:
    p = _cache_path(key)
    if not p.exists():
        return None
    try:
        age = time.time() - p.stat().st_mtime
        if age > EDGAR_CACHE_TTL:
            return None
        return json.loads(p.read_text())
    except (OSError, json.JSONDecodeError):
        return None


def _save_cache(key: str, data: dict):
    try:
        _cache_path(key).write_text(json.dumps(data, indent=2, default=str))
    except OSError as exc:
        logger.warning("Cache write failed for %s: %s", key, exc)


# ── Filtering helpers ──────────────────────────────────────────────────────────

_EXCLUDE_RE  = [re.compile(p, re.IGNORECASE) for p in EXCLUDE_PATTERNS]
_REQUIRE_RE  = [re.compile(p, re.IGNORECASE) for p in FUND_REQUIRED_PATTERNS]


def _is_relevant_fund(entity_name: str) -> bool:
    if any(p.search(entity_name) for p in _EXCLUDE_RE):
        return False
    if not any(p.search(entity_name) for p in _REQUIRE_RE):
        return False
    return True


# ── Strategy inference ─────────────────────────────────────────────────────────

_STRAT_RE = {
    strat: [re.compile(p, re.IGNORECASE) for p in patterns]
    for strat, patterns in STRATEGY_PATTERNS.items()
}


def infer_strategy(text: str) -> str:
    """Return the best-matching strategy label, or 'Private Credit' as default."""
    for strat, patterns in _STRAT_RE.items():
        if any(p.search(text) for p in patterns):
            return strat
    return "Private Credit"


# ── XML parsing ────────────────────────────────────────────────────────────────

def _xml_tag(root: ET.Element, *tags: str) -> Optional[str]:
    """Find the first matching tag in an XML tree (case-insensitive namespace handling)."""
    for tag in tags:
        # Try with and without namespace
        for elem in root.iter():
            if elem.tag.split("}")[-1].lower() == tag.lower():
                return (elem.text or "").strip() or None
    return None


def _parse_amount(s: Optional[str]) -> Optional[float]:
    if not s:
        return None
    try:
        return float(re.sub(r"[^\d.]", "", s))
    except ValueError:
        return None


def _parse_bool(s: Optional[str]) -> bool:
    return str(s or "").strip().lower() in ("true", "1", "yes")


def parse_form_d_xml(xml_bytes: bytes, accession_no: str) -> Optional[dict]:
    """
    Parse a Form D XML document into a flat dict of key fields.
    Returns None if the filing is not a pooled investment fund.
    """
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as exc:
        logger.warning("XML parse error for %s: %s", accession_no, exc)
        return None

    is_pooled = _parse_bool(_xml_tag(root, "isPooledInvestmentFund"))
    if not is_pooled:
        return None

    entity_name = (_xml_tag(root, "entityName", "issuerName") or "").strip()
    if not entity_name or not _is_relevant_fund(entity_name):
        return None

    total_offering = _parse_amount(_xml_tag(root, "totalOfferingAmount"))
    total_sold     = _parse_amount(_xml_tag(root, "totalAmountSold"))

    if total_offering is not None and total_offering < MIN_RAISE_AMOUNT:
        return None

    # Offering status
    date_first_sale = _xml_tag(root, "dateOfFirstSale")
    if total_sold and total_offering and total_sold >= total_offering * 0.95:
        offering_status = "closed"
    elif date_first_sale:
        offering_status = "open"
    else:
        offering_status = "unknown"

    # State of issuer
    state = _xml_tag(root, "issuerState", "stateOfIncorporation")

    # Related persons (key contacts)
    persons = []
    for person in root.iter():
        if person.tag.split("}")[-1].lower() == "relatedpersoninfo":
            first = _xml_tag(person, "relatedPersonFirstName") or ""
            last  = _xml_tag(person, "relatedPersonLastName")  or ""
            roles = [
                r.text.strip()
                for r in person.iter()
                if r.tag.split("}")[-1].lower() == "relatedpersonrelationshiptype"
                and r.text and r.text.strip()
            ]
            name = f"{first} {last}".strip()
            if name:
                persons.append({"name": name, "roles": roles})

    return {
        "accession_no":       accession_no,
        "entity_name":        entity_name,
        "total_offering":     total_offering,
        "total_sold":         total_sold,
        "offering_status":    offering_status,
        "date_first_sale":    date_first_sale,
        "state":              state,
        "related_persons":    persons,
    }


# ── Scoring ────────────────────────────────────────────────────────────────────

def _tier_score(value: Optional[float], tiers: list[tuple]) -> float:
    """Look up value in an ordered (threshold, score) tier list."""
    if value is None:
        return 0.0
    for threshold, score in tiers:
        if value >= threshold:
            return float(score)
    return 0.0


def score_signal(
    filing: dict,
    days_since_filing: int,
    is_amendment: bool,
    open_role_count: int = 0,
) -> float:
    """
    Compute a 1–10 hiring signal score for a Form D filing.

    Args:
        filing:            Parsed form D dict (from parse_form_d_xml).
        days_since_filing: Calendar days between filing date and today.
        is_amendment:      True if form type is D/A (amendment) not new D.
        open_role_count:   Number of open roles already found at this manager.
    """
    w = SCORE_WEIGHTS

    recency_raw = _tier_score(
        max(0, 90 - days_since_filing),  # invert so higher = more recent
        [(83, 10), (76, 8), (60, 6), (30, 4), (0, 2)],
    )
    size_raw    = _tier_score(filing.get("total_offering"), RAISE_TIERS)
    new_fund    = 10.0 if not is_amendment else 4.0
    jobs_bonus  = min(10.0, 3.0 + open_role_count * 0.7) if open_role_count else 0.0

    raw = (
        w["recency"]     * recency_raw +
        w["raise_size"]  * size_raw    +
        w["new_fund"]    * new_fund    +
        w["jobs_posted"] * jobs_bonus
    )
    return round(min(10.0, max(1.0, raw)), 1)


# ── Main fetch → score pipeline ────────────────────────────────────────────────

@dataclass
class FundSignal:
    accession_no:     str
    cik:              str
    entity_name:      str           # raw EDGAR name
    file_date:        str           # YYYY-MM-DD
    form_type:        str           # "D" or "D/A"
    days_since_filing:int
    total_offering:   Optional[float]
    total_sold:       Optional[float]
    offering_status:  str
    strategy:         str
    signal_score:     float
    state:            Optional[str]
    related_persons:  list = field(default_factory=list)
    source_url:       str = ""


def _days_since(date_str: str) -> int:
    try:
        filed = datetime.strptime(date_str[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - filed).days
    except (ValueError, TypeError):
        return 999


def _build_archive_url(cik: str, accession_no: str) -> str:
    accession_clean = accession_no.replace("-", "")
    return f"{EDGAR_ARCHIVE_URL}/{cik}/{accession_clean}/primary_doc.xml"


def fetch_edgar_filings(days_back: int = 90) -> list[dict]:
    """
    Search EDGAR for Form D filings within the last `days_back` days
    across all private-credit related search terms.
    Returns deduplicated list of raw filing metadata dicts.
    """
    from datetime import timedelta
    end_dt   = datetime.now(timezone.utc)
    start_dt = end_dt - timedelta(days=days_back)
    start    = start_dt.strftime("%Y-%m-%d")
    end      = end_dt.strftime("%Y-%m-%d")

    seen_accessions: set[str] = set()
    all_hits: list[dict] = []

    for query in EDGAR_QUERIES:
        cache_key = f"search_{query.replace(' ', '_')}_{start}_{end}"
        cached = _load_cache(cache_key)
        if cached:
            hits = cached.get("hits", [])
        else:
            params = (
                f"?q=%22{urllib.parse.quote(query)}%22"   # type: ignore[name-defined]
                f"&forms=D"
                f"&dateRange=custom&startdt={start}&enddt={end}"
                f"&hits.hits.total.value=true&hits.hits._source=adsh,display_names,"
                f"entity_name,file_date,form_type,ciks"
            )
            raw = _get(EDGAR_SEARCH_URL + params)
            if raw is None:
                logger.warning("EDGAR search failed for query: %s", query)
                continue
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue
            hits = (data.get("hits") or {}).get("hits") or []
            _save_cache(cache_key, {"hits": hits, "fetched_at": time.time()})

        for hit in hits:
            src = hit.get("_source") or {}
            adsh = src.get("adsh") or hit.get("_id")
            if not adsh or adsh in seen_accessions:
                continue
            seen_accessions.add(adsh)
            display = src.get("display_names") or []
            entity  = display[0] if display else src.get("entity_name") or ""
            entity  = re.sub(r"\s*\(CIK\s+\d+\)\s*$", "", entity).strip()
            ciks    = src.get("ciks") or []
            cik     = str(int(ciks[0])) if ciks else ""
            all_hits.append({
                "accession_no": adsh,
                "cik":          cik,
                "entity_name":  entity,
                "file_date":    src.get("file_date") or "",
                "form_type":    src.get("form_type") or "D",
            })

    return all_hits


import urllib.parse   # needed above for quote


def get_signals(days_back: int = 90) -> list[FundSignal]:
    """
    Full Task 2 pipeline: fetch EDGAR hits → fetch XML → parse → score.
    Returns a sorted list of FundSignal (highest score first).
    """
    raw_hits = fetch_edgar_filings(days_back=days_back)
    logger.info("EDGAR search returned %d unique filings", len(raw_hits))

    signals: list[FundSignal] = []

    for hit in raw_hits:
        accession_no = hit["accession_no"]
        cik          = hit["cik"]
        entity_name  = hit["entity_name"]
        file_date    = hit["file_date"]
        form_type    = hit["form_type"]

        if not entity_name or not _is_relevant_fund(entity_name):
            continue

        days = _days_since(file_date)
        if days > days_back:
            continue

        # Fetch and cache the XML
        xml_cache_key = f"xml_{accession_no}"
        cached_xml = _load_cache(xml_cache_key)
        if cached_xml:
            parsed = cached_xml.get("parsed")
        else:
            archive_url = _build_archive_url(cik, accession_no)
            xml_bytes   = _get(archive_url)
            if xml_bytes is None:
                continue
            parsed = parse_form_d_xml(xml_bytes, accession_no)
            _save_cache(xml_cache_key, {"parsed": parsed, "fetched_at": time.time()})

        if parsed is None:
            continue

        strategy = infer_strategy(entity_name)
        score    = score_signal(
            filing=parsed,
            days_since_filing=days,
            is_amendment=(form_type == "D/A"),
        )

        source_url = (
            f"https://www.sec.gov/cgi-bin/browse-edgar"
            f"?action=getcompany&CIK={cik}&type=D&dateb=&owner=include&count=10"
        )

        signals.append(FundSignal(
            accession_no=accession_no,
            cik=cik,
            entity_name=entity_name,
            file_date=file_date,
            form_type=form_type,
            days_since_filing=days,
            total_offering=parsed.get("total_offering"),
            total_sold=parsed.get("total_sold"),
            offering_status=parsed.get("offering_status", "unknown"),
            strategy=strategy,
            signal_score=score,
            state=parsed.get("state"),
            related_persons=parsed.get("related_persons") or [],
            source_url=source_url,
        ))

    signals.sort(key=lambda s: s.signal_score, reverse=True)
    logger.info("Produced %d scored fund signals", len(signals))
    return signals


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    sigs = get_signals(days_back=30)
    for s in sigs[:10]:
        amt = f"${s.total_offering/1e6:.0f}M" if s.total_offering else "—"
        print(f"[{s.signal_score:4.1f}] {s.entity_name:55s} {amt:10s} {s.strategy:20s} {s.file_date}")
