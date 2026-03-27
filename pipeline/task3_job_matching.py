"""
Task 3: Job Matching
---------------------
For each resolved fund manager, fetch open roles from known career pages
(Greenhouse, Lever, Ashby) and tag them by function (Investment, IR, Ops…).

The CAREER_PAGE_REGISTRY maps canonical manager names to their ATS slugs
and direct careers URL, so output always carries a source URL.
"""

import json
import logging
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import urllib.request
import urllib.error

from config import (
    JOBS_CACHE, JOBS_CACHE_TTL, JOB_FUNCTIONS,
    REQUEST_TIMEOUT, REQUEST_RETRIES,
)

logger = logging.getLogger(__name__)

# ── Career page registry ───────────────────────────────────────────────────────
# Maps canonical manager name → ATS config dict.
# greenhouse/lever/ashby: slug for the respective API.
# careers_url: direct link shown in UI even when API scraping returns nothing.

CAREER_PAGE_REGISTRY: dict[str, dict] = {
    "Ares Management":              {"greenhouse": "aresmgmt",              "careers_url": "https://www.ares.com/careers"},
    "Apollo Global Management":     {"greenhouse": "apolloglobal",          "careers_url": "https://www.apollo.com/careers"},
    "Oaktree Capital Management":   {"greenhouse": "oaktree",               "careers_url": "https://www.oaktreecapital.com/careers"},
    "Blackstone Credit":            {"greenhouse": "blackstone",            "careers_url": "https://www.blackstone.com/careers"},
    "HPS Investment Partners":      {"greenhouse": "hpsinvestmentpartners", "careers_url": "https://www.hpsinvest.com/careers"},
    "KKR Credit":                   {"greenhouse": "kkr",                   "careers_url": "https://www.kkr.com/careers"},
    "Centerbridge Partners":        {"greenhouse": "centerbridgepartners",  "careers_url": "https://www.centerbridgepartners.com/careers"},
    "Blue Owl Capital":             {"greenhouse": "blueowl",               "careers_url": "https://www.blueowlcapital.com/careers"},
    "Bain Capital Credit":          {"greenhouse": "baincapital",           "careers_url": "https://www.baincapital.com/careers"},
    "Monarch Alternative Capital":  {"lever":      "monarchalternative",    "careers_url": "https://www.monarchalternative.com"},
    "Avenue Capital Group":         {"careers_url": "https://www.avenuecapital.com"},
    "Silver Point Capital":         {"lever":      "silverpoint",           "careers_url": "https://www.silverpointcapital.com"},
    "Marathon Asset Management":    {"greenhouse": "marathonassetmanagement","careers_url": "https://www.marathonam.com"},
    "Brigade Capital Management":   {"lever":      "brigidecapital",        "careers_url": "https://www.brigadecapital.com"},
    "King Street Capital":          {"careers_url": "https://www.kingstreetcapital.com"},
    "Mudrick Capital Management":   {"careers_url": "https://www.mudrickcapital.com"},
    "TPG Angelo Gordon":            {"greenhouse": "angelogordon",          "careers_url": "https://www.tpg.com/careers"},
    "Carlyle Credit":               {"greenhouse": "carlyle",               "careers_url": "https://www.carlyle.com/careers"},
    "Benefit Street Partners":      {"greenhouse": "benefitstreetpartners", "careers_url": "https://www.benefitstreetpartners.com"},
    "Antares Capital":              {"greenhouse": "antarescapital",        "careers_url": "https://www.antarescapital.com/careers"},
    "Golub Capital":                {"greenhouse": "golubcapital",          "careers_url": "https://www.golubcapital.com/careers"},
    "Magnetar Capital":             {"ashby":      "magnetar",              "careers_url": "https://www.magnetar.com/careers"},
    "First Eagle Alternative Capital":{"greenhouse":"firsteagle",           "careers_url": "https://www.firsteagle.com/careers"},
    "Neuberger Berman Credit":      {"greenhouse": "neubergerberman",       "careers_url": "https://www.nb.com/en/us/careers"},
    "Silver Lake Credit":           {"greenhouse": "silverlake",            "careers_url": "https://www.silverlake.com/careers"},
    "TPG Capital":                  {"greenhouse": "tpg",                   "careers_url": "https://www.tpg.com/careers"},
    "Millennium Management":        {"greenhouse": "millenniummanagement",  "careers_url": "https://www.mlp.com/careers"},
    "Warburg Pincus":               {"greenhouse": "warburgpincusllc",      "careers_url": "https://www.warburgpincus.com/careers"},
}

# ── HTTP helper ────────────────────────────────────────────────────────────────

def _get_json(url: str, retries: int = REQUEST_RETRIES) -> Optional[object]:
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (compatible; Onlu/1.0)"},
            )
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as exc:
            if exc.code in (403, 404):
                return None
            logger.debug("HTTP %d fetching %s (attempt %d)", exc.code, url, attempt + 1)
        except Exception as exc:
            logger.debug("Error fetching %s (attempt %d): %s", url, attempt + 1, exc)
        if attempt < retries:
            time.sleep(1.5 ** attempt)
    return None


# ── Caching ────────────────────────────────────────────────────────────────────

def _cache_path(firm_id: str) -> Path:
    safe = re.sub(r"[^\w]", "_", firm_id)
    return JOBS_CACHE / f"{safe}.json"


def _load_job_cache(firm_id: str) -> Optional[list]:
    p = _cache_path(firm_id)
    if not p.exists():
        return None
    age = time.time() - p.stat().st_mtime
    if age > JOBS_CACHE_TTL:
        return None
    try:
        return json.loads(p.read_text())
    except (OSError, json.JSONDecodeError):
        return None


def _save_job_cache(firm_id: str, jobs: list):
    try:
        _cache_path(firm_id).write_text(json.dumps(jobs, indent=2, default=str))
    except OSError as exc:
        logger.warning("Job cache write failed for %s: %s", firm_id, exc)


# ── Job classification ─────────────────────────────────────────────────────────

_FUNC_RE = {
    func: [re.compile(p, re.IGNORECASE) for p in patterns]
    for func, patterns in JOB_FUNCTIONS.items()
}

# Exclude obviously non-investment roles (IT, HR, etc.)
_IRRELEVANT_RE = re.compile(
    r"\b(software engineer|developer|devops|sysadmin|IT support|"
    r"HR|human resources|recruiter|talent acquisition|"
    r"office manager|facilities|receptionist|payroll|"
    r"marketing manager|content|social media|SEO|"
    r"sales|account executive|business development|"
    r"product manager|scrum master|supply chain)\b",
    re.IGNORECASE,
)

_FINANCE_RE = re.compile(
    r"\b(credit|equity|fund|hedge|portfolio|investment|investor|analyst|"
    r"quant|fixed income|distressed|lending|capital|asset|securities|"
    r"trading|research|finance|financial|private|debt|yield|"
    r"restructur|origination|underwriting|associate|vice president|"
    r"managing director|director|partner)\b",
    re.IGNORECASE,
)


def classify_role(title: str) -> Optional[str]:
    """Return job function label or None if role is irrelevant."""
    if _IRRELEVANT_RE.search(title):
        return None
    if not _FINANCE_RE.search(title):
        return None
    for func, patterns in _FUNC_RE.items():
        if any(p.search(title) for p in patterns):
            return func
    return "Investment"   # default for finance roles that don't match more specific buckets


def _days_since_ms(ms: int) -> int:
    return int((time.time() * 1000 - ms) / 86_400_000)


def _days_since_str(date_str: str) -> int:
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - dt).days
    except (ValueError, TypeError):
        return 0


# ── Data model ─────────────────────────────────────────────────────────────────

@dataclass
class JobListing:
    id:           str
    manager_name: str
    title:        str
    location:     str
    function:     str            # Investment / Portfolio Monitoring / IR / Legal / Operations
    posted_date:  str            # YYYY-MM-DD or ""
    days_ago:     int
    url:          str
    source:       str            # "greenhouse" | "lever" | "ashby" | "careers_page"


# ── Greenhouse scraper ─────────────────────────────────────────────────────────

def _fetch_greenhouse(slug: str, manager_name: str) -> list[JobListing]:
    data = _get_json(f"https://boards.greenhouse.io/{slug}/jobs.json")
    if not isinstance(data, dict):
        return []
    jobs: list[JobListing] = []
    for job in data.get("jobs") or []:
        title    = job.get("title") or ""
        function = classify_role(title)
        if not function:
            continue
        updated  = job.get("updated_at") or ""
        days     = _days_since_str(updated) if updated else 0
        loc      = (job.get("location") or {}).get("name") or "—"
        loc      = loc.split(",")[0].strip()
        date_str = updated[:10] if updated else ""
        jobs.append(JobListing(
            id=f"gh-{slug}-{job.get('id', '')}",
            manager_name=manager_name,
            title=title,
            location=loc,
            function=function,
            posted_date=date_str,
            days_ago=days,
            url=job.get("absolute_url") or f"https://boards.greenhouse.io/{slug}",
            source="greenhouse",
        ))
    return jobs


# ── Lever scraper ──────────────────────────────────────────────────────────────

def _fetch_lever(slug: str, manager_name: str) -> list[JobListing]:
    data = _get_json(f"https://api.lever.co/v0/postings/{slug}?mode=json")
    if not isinstance(data, list):
        return []
    jobs: list[JobListing] = []
    for posting in data:
        title    = posting.get("text") or ""
        function = classify_role(title)
        if not function:
            continue
        created  = posting.get("createdAt") or 0
        days     = _days_since_ms(created) if created else 0
        loc      = (posting.get("categories") or {}).get("location") or "—"
        loc      = loc.split(",")[0].strip()
        date_str = datetime.utcfromtimestamp(created / 1000).strftime("%Y-%m-%d") if created else ""
        jobs.append(JobListing(
            id=f"lever-{slug}-{posting.get('id', '')}",
            manager_name=manager_name,
            title=title,
            location=loc,
            function=function,
            posted_date=date_str,
            days_ago=days,
            url=posting.get("hostedUrl") or posting.get("applyUrl") or f"https://jobs.lever.co/{slug}",
            source="lever",
        ))
    return jobs


# ── Ashby scraper ──────────────────────────────────────────────────────────────

def _fetch_ashby(slug: str, manager_name: str) -> list[JobListing]:
    data = _get_json(f"https://api.ashbyhq.com/posting-api/job-board/{slug}")
    if not isinstance(data, dict):
        return []
    jobs: list[JobListing] = []
    for posting in data.get("jobPostings") or []:
        title    = posting.get("title") or ""
        function = classify_role(title)
        if not function:
            continue
        published = posting.get("publishedDate") or ""
        days      = _days_since_str(published) if published else 0
        loc       = posting.get("locationName") or "—"
        loc       = loc.split(",")[0].strip()
        jobs.append(JobListing(
            id=f"ashby-{slug}-{posting.get('id', '')}",
            manager_name=manager_name,
            title=title,
            location=loc,
            function=function,
            posted_date=published[:10] if published else "",
            days_ago=days,
            url=posting.get("jobUrl") or f"https://jobs.ashbyhq.com/{slug}",
            source="ashby",
        ))
    return jobs


# ── Public interface ───────────────────────────────────────────────────────────

def fetch_jobs_for_manager(manager_name: str) -> list[JobListing]:
    """
    Fetch all open roles for a canonical manager name.
    Results are cached for JOBS_CACHE_TTL seconds.
    Returns [] if manager not in registry or scraping fails.
    """
    cfg = CAREER_PAGE_REGISTRY.get(manager_name)
    if not cfg:
        logger.debug("No career registry entry for: %s", manager_name)
        return []

    cached = _load_job_cache(manager_name)
    if cached is not None:
        return [JobListing(**j) for j in cached]

    jobs: list[JobListing] = []
    if "greenhouse" in cfg:
        jobs.extend(_fetch_greenhouse(cfg["greenhouse"], manager_name))
    if "lever" in cfg:
        jobs.extend(_fetch_lever(cfg["lever"], manager_name))
    if "ashby" in cfg:
        jobs.extend(_fetch_ashby(cfg["ashby"], manager_name))

    logger.info("Fetched %d relevant roles for %s", len(jobs), manager_name)
    _save_job_cache(manager_name, [j.__dict__ for j in jobs])
    return jobs


def match_jobs_to_signals(
    manager_names: list[str],
) -> dict[str, list[JobListing]]:
    """
    Fetch jobs for each resolved manager.
    Returns dict: manager_name → [JobListing, …]
    """
    result: dict[str, list[JobListing]] = {}
    for name in manager_names:
        result[name] = fetch_jobs_for_manager(name)
    return result


def get_careers_url(manager_name: str) -> Optional[str]:
    """Return the direct careers page URL for a manager (always available)."""
    cfg = CAREER_PAGE_REGISTRY.get(manager_name)
    return cfg.get("careers_url") if cfg else None


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    for firm in ["Ares Management", "Golub Capital", "KKR Credit", "Oaktree Capital Management"]:
        jobs = fetch_jobs_for_manager(firm)
        print(f"\n{firm}: {len(jobs)} roles")
        for j in jobs[:5]:
            print(f"  [{j.function:25s}] {j.title:50s} {j.location}")
