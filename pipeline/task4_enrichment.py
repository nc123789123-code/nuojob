"""
Task 4: Enrichment
-------------------
For each resolved fund manager, pull supplementary data:

  1. SEC Form ADV  — AUM and employee count from EDGAR IAPD/submissions API
  2. Google News   — Recent press coverage tagged as fundraising or hiring news

Data is cached aggressively (ADV: 7 days, news: 4 hours) to avoid
hammering SEC endpoints and to stay within Google News rate limits.
"""

import json
import logging
import re
import time
import urllib.parse
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from config import (
    EDGAR_HEADERS, EDGAR_SEARCH_URL, EDGAR_SUBMISSIONS,
    CACHE_DIR, ADV_CACHE_TTL, NEWS_CACHE_TTL,
    REQUEST_TIMEOUT, REQUEST_RETRIES,
)

logger = logging.getLogger(__name__)

ADV_CACHE  = CACHE_DIR / "adv"
NEWS_CACHE = CACHE_DIR / "news"
ADV_CACHE.mkdir(exist_ok=True)
NEWS_CACHE.mkdir(exist_ok=True)


# ── HTTP helpers ───────────────────────────────────────────────────────────────

def _get(url: str, headers: Optional[dict] = None, retries: int = REQUEST_RETRIES) -> Optional[bytes]:
    hdrs = {**EDGAR_HEADERS, **(headers or {})}
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=hdrs)
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
                return resp.read()
        except urllib.error.HTTPError as exc:
            if exc.code in (403, 404):
                return None
            logger.debug("HTTP %d on %s", exc.code, url)
        except Exception as exc:
            logger.debug("Error %s: %s", url, exc)
        if attempt < retries:
            time.sleep(1.5 ** attempt)
    return None


def _cached(path: Path, ttl: int) -> Optional[dict]:
    if not path.exists():
        return None
    if time.time() - path.stat().st_mtime > ttl:
        return None
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return None


def _write_cache(path: Path, data: dict):
    try:
        path.write_text(json.dumps(data, indent=2, default=str))
    except OSError as exc:
        logger.warning("Cache write failed %s: %s", path, exc)


# ── Data models ────────────────────────────────────────────────────────────────

@dataclass
class NewsItem:
    title:   str
    url:     str
    source:  str
    pub_date:str   # RFC-2822 or ISO
    tag:     str   # "fundraising" | "hiring" | "general"


@dataclass
class EnrichmentData:
    manager_name:    str
    aum_total:       Optional[float]   # USD
    employee_count:  Optional[int]
    adv_cik:         Optional[str]
    adv_date:        Optional[str]     # date of latest ADV filing
    adv_source_url:  Optional[str]
    news:            list[NewsItem] = field(default_factory=list)
    strategy_tags:   list[str]     = field(default_factory=list)


# ── SEC Form ADV ───────────────────────────────────────────────────────────────

def _search_adv_cik(manager_name: str) -> Optional[str]:
    """
    Search EDGAR full-text for Form ADV filings matching the manager name.
    Returns the CIK of the first match, or None.
    """
    q   = urllib.parse.quote(f'"{manager_name}"')
    url = f"{EDGAR_SEARCH_URL}?q={q}&forms=ADV&hits.hits._source=ciks,display_names"
    raw = _get(url)
    if raw is None:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    hits = (data.get("hits") or {}).get("hits") or []
    if not hits:
        return None
    ciks = (hits[0].get("_source") or {}).get("ciks") or []
    return str(int(ciks[0])) if ciks else None


def _fetch_adv_from_submissions(cik: str) -> dict:
    """
    Pull the SEC submissions API for a CIK and extract ADV-relevant fields.
    Returns a dict with aum_total, employee_count, adv_date.
    """
    padded = cik.zfill(10)
    url    = f"{EDGAR_SUBMISSIONS}/CIK{padded}.json"
    raw    = _get(url)
    if raw is None:
        return {}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {}

    # Find the most recent ADV or ADV-W filing
    filings     = data.get("filings") or {}
    recent      = filings.get("recent") or {}
    form_types  = recent.get("form") or []
    dates       = recent.get("filingDate") or []
    accessions  = recent.get("accessionNumber") or []

    adv_idx = None
    for i, ft in enumerate(form_types):
        if ft.startswith("ADV"):
            adv_idx = i
            break

    result: dict = {}
    if adv_idx is not None:
        result["adv_date"] = dates[adv_idx] if adv_idx < len(dates) else None
        acc = accessions[adv_idx] if adv_idx < len(accessions) else ""
        if acc:
            acc_clean = acc.replace("-", "")
            result["adv_source_url"] = (
                f"https://www.sec.gov/cgi-bin/browse-edgar"
                f"?action=getcompany&CIK={cik}&type=ADV&dateb=&owner=include&count=10"
            )

    # Extract high-level stats from the 'iapd' section if present
    iapd = data.get("iapd") or {}
    if iapd:
        # AUM is typically in 'totalAum' or nested under 'aum'
        aum = iapd.get("totalAum") or iapd.get("aum")
        if isinstance(aum, (int, float)):
            result["aum_total"] = float(aum)
        employees = iapd.get("numEmployees") or iapd.get("employees")
        if isinstance(employees, (int, str)):
            try:
                result["employee_count"] = int(str(employees).replace(",", ""))
            except ValueError:
                pass

    return result


def fetch_adv_data(manager_name: str) -> dict:
    """
    Fetch and return Form ADV enrichment for a manager.
    Cached for ADV_CACHE_TTL (7 days).
    """
    safe  = re.sub(r"[^\w]", "_", manager_name)
    cache = ADV_CACHE / f"{safe}.json"
    hit   = _cached(cache, ADV_CACHE_TTL)
    if hit is not None:
        return hit

    cik = _search_adv_cik(manager_name)
    if not cik:
        result: dict = {"adv_cik": None}
        _write_cache(cache, result)
        return result

    adv = _fetch_adv_from_submissions(cik)
    adv["adv_cik"] = cik
    _write_cache(cache, adv)
    return adv


# ── Google News RSS ────────────────────────────────────────────────────────────

_NEWS_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

_ITEM_RE      = re.compile(r"<item>(.*?)</item>",     re.DOTALL)
_TITLE_RE     = re.compile(r"<title>(.*?)</title>",   re.DOTALL)
_LINK_RE      = re.compile(r"<link>(.*?)</link>",     re.DOTALL)
_PUBDATE_RE   = re.compile(r"<pubDate>(.*?)</pubDate>",re.DOTALL)
_SOURCE_RE    = re.compile(r"<source[^>]*>(.*?)</source>", re.DOTALL)

_FUNDRAISING_RE = re.compile(
    r"\b(rais(?:ing|ed|e[sd]?)|fund|capital|clos(?:e|ing|ed)|billion|million|invest)\b",
    re.IGNORECASE,
)
_HIRING_RE = re.compile(
    r"\b(hir(?:ing|es|ed)|recruit|appoint(?:ed|ment)?|joins?|promot|talent|head(?:count)?)\b",
    re.IGNORECASE,
)


def _clean_cdata(s: str) -> str:
    return re.sub(r"<!\[CDATA\[(.*?)\]\]>", r"\1", s, flags=re.DOTALL).strip()


def _tag_article(title: str) -> str:
    if _FUNDRAISING_RE.search(title):
        return "fundraising"
    if _HIRING_RE.search(title):
        return "hiring"
    return "general"


def _parse_rss(xml_text: str) -> list[NewsItem]:
    items = []
    for block in _ITEM_RE.findall(xml_text):
        title_m  = _TITLE_RE.search(block)
        link_m   = _LINK_RE.search(block)
        date_m   = _PUBDATE_RE.search(block)
        source_m = _SOURCE_RE.search(block)

        title   = _clean_cdata(title_m.group(1))   if title_m  else ""
        link    = _clean_cdata(link_m.group(1))    if link_m   else ""
        pub     = _clean_cdata(date_m.group(1))    if date_m   else ""
        source  = _clean_cdata(source_m.group(1))  if source_m else ""

        if title and link:
            items.append(NewsItem(
                title=title, url=link, source=source,
                pub_date=pub, tag=_tag_article(title),
            ))
    return items


def _fetch_news_rss(query: str) -> list[NewsItem]:
    q   = urllib.parse.quote(query)
    url = f"https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en"
    raw = _get(url, headers=_NEWS_HEADERS)
    if raw is None:
        return []
    try:
        return _parse_rss(raw.decode("utf-8", errors="replace"))
    except Exception as exc:
        logger.warning("RSS parse error for query %r: %s", query, exc)
        return []


def fetch_news(manager_name: str, max_articles: int = 8) -> list[NewsItem]:
    """
    Fetch recent news for a manager from Google News RSS.
    Two queries: one for fundraising, one for hiring signals.
    Cached for NEWS_CACHE_TTL (4 hours).
    """
    safe  = re.sub(r"[^\w]", "_", manager_name)
    cache = NEWS_CACHE / f"{safe}.json"
    hit   = _cached(cache, NEWS_CACHE_TTL)
    if hit is not None:
        return [NewsItem(**n) for n in (hit.get("articles") or [])]

    # Query 1: fundraising signal
    q1 = f'"{manager_name}" fund raise capital'
    # Query 2: hiring signal
    q2 = f'"{manager_name}" hiring recruit'

    items = _fetch_news_rss(q1) + _fetch_news_rss(q2)

    # Deduplicate by title
    seen:   set[str] = set()
    unique: list[NewsItem] = []
    for item in items:
        key = item.title[:80].lower()
        if key not in seen:
            seen.add(key)
            unique.append(item)

    # Sort: fundraising first, then hiring, then general; recency as tiebreaker
    priority = {"fundraising": 0, "hiring": 1, "general": 2}
    unique.sort(key=lambda n: priority.get(n.tag, 3))
    unique = unique[:max_articles]

    _write_cache(cache, {"articles": [n.__dict__ for n in unique]})
    return unique


# ── Unified enrichment ─────────────────────────────────────────────────────────

def enrich_manager(manager_name: str, strategy_tags: Optional[list] = None) -> EnrichmentData:
    """
    Run all enrichment sources for a single manager and return EnrichmentData.
    """
    adv  = fetch_adv_data(manager_name)
    news = fetch_news(manager_name)

    return EnrichmentData(
        manager_name=manager_name,
        aum_total=adv.get("aum_total"),
        employee_count=adv.get("employee_count"),
        adv_cik=adv.get("adv_cik"),
        adv_date=adv.get("adv_date"),
        adv_source_url=adv.get("adv_source_url"),
        news=news,
        strategy_tags=strategy_tags or [],
    )


def enrich_all(manager_names: list[str]) -> dict[str, EnrichmentData]:
    """Enrich a list of canonical manager names. Returns name → EnrichmentData."""
    return {name: enrich_manager(name) for name in manager_names}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    for firm in ["Ares Management", "Oaktree Capital Management", "KKR Credit"]:
        data = enrich_manager(firm)
        aum  = f"${data.aum_total/1e9:.1f}B" if data.aum_total else "—"
        print(f"\n{firm}")
        print(f"  AUM:       {aum}")
        print(f"  Employees: {data.employee_count or '—'}")
        print(f"  ADV CIK:   {data.adv_cik or '—'}")
        print(f"  News ({len(data.news)}):")
        for n in data.news[:3]:
            print(f"    [{n.tag:12s}] {n.title[:80]}")
