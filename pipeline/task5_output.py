"""
Task 5: Output Structure
-------------------------
Assembles all pipeline data (entity match, fund signal, jobs, enrichment)
into the canonical per-fund JSON format and writes:

  - pipeline/output/<manager_slug>.json     one file per fund vehicle
  - pipeline/output/all_funds.json          combined index
  - pipeline/output/review_queue.json       low-confidence / flagged entries
"""

import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from config import OUTPUT_DIR
from task1_entity_resolution import EntityMatch
from task2_signal_scoring import FundSignal
from task3_job_matching import JobListing, get_careers_url
from task4_enrichment import EnrichmentData, NewsItem

logger = logging.getLogger(__name__)


# ── Output schema (matches the spec exactly) ───────────────────────────────────

def _fmt_amount(v: Optional[float]) -> Optional[int]:
    return int(v) if v is not None else None


def _fmt_news(news: list[NewsItem]) -> list[dict]:
    return [
        {"title": n.title, "url": n.url, "source": n.source,
         "pub_date": n.pub_date, "tag": n.tag}
        for n in news
    ]


def _fmt_jobs(jobs: list[JobListing]) -> list[dict]:
    return [
        {
            "title":       j.title,
            "location":    j.location,
            "function":    j.function,
            "posted_date": j.posted_date,
            "url":         j.url,
            "source":      j.source,
        }
        for j in sorted(jobs, key=lambda x: x.days_ago)
    ]


def build_fund_output(
    signal:  FundSignal,
    entity:  EntityMatch,
    jobs:    list[JobListing],
    enrich:  Optional[EnrichmentData],
) -> dict:
    """
    Construct a single fund output dict per the Task 5 spec.
    Every data point includes its source_url.
    """
    manager_name = entity.manager_name or entity.normalized or signal.entity_name
    careers_url  = get_careers_url(manager_name)

    return {
        # Core identification
        "manager_name":       manager_name,
        "fund_vehicle":       signal.entity_name,
        "confidence":         entity.confidence,
        "review_flag":        entity.review_flag,

        # Form D filing data
        "form_d_filing_date": signal.file_date,
        "form_type":          signal.form_type,
        "amount_raised":      _fmt_amount(signal.total_offering),
        "amount_sold":        _fmt_amount(signal.total_sold),
        "offering_status":    signal.offering_status,
        "strategy":           signal.strategy,
        "state":              signal.state,
        "hiring_signal_score":signal.signal_score,
        "days_since_filing":  signal.days_since_filing,
        "key_contacts":       signal.related_persons,
        "edgar_source_url":   signal.source_url,

        # Jobs
        "open_roles":         _fmt_jobs(jobs),
        "open_role_count":    len(jobs),
        "careers_page":       careers_url,

        # Enrichment
        "aum_total":          _fmt_amount(enrich.aum_total)      if enrich else None,
        "employee_count":     enrich.employee_count              if enrich else None,
        "adv_source_url":     enrich.adv_source_url             if enrich else None,
        "recent_news":        _fmt_news(enrich.news)            if enrich else [],
        "strategy_tags":      enrich.strategy_tags              if enrich else [],

        # Metadata
        "last_updated":       datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


def _manager_slug(manager_name: str) -> str:
    return re.sub(r"[^\w]", "_", manager_name.lower()).strip("_")


def write_outputs(fund_outputs: list[dict], review_queue: list[dict]):
    """
    Write per-fund JSON files + combined index + review queue.
    """
    written = 0
    for record in fund_outputs:
        slug = _manager_slug(record["manager_name"])
        # Use accession number suffix to differentiate multiple funds per manager
        acc  = re.sub(r"[^\w]", "", str(record.get("edgar_source_url") or ""))[-12:]
        path = OUTPUT_DIR / f"{slug}__{acc}.json"
        try:
            path.write_text(json.dumps(record, indent=2, default=str))
            written += 1
        except OSError as exc:
            logger.warning("Failed to write %s: %s", path, exc)

    # Combined index (sorted by score desc)
    index = sorted(fund_outputs, key=lambda r: r.get("hiring_signal_score", 0), reverse=True)
    idx_path = OUTPUT_DIR / "all_funds.json"
    try:
        idx_path.write_text(json.dumps(index, indent=2, default=str))
    except OSError as exc:
        logger.error("Failed to write all_funds.json: %s", exc)

    # Review queue
    rq_path = OUTPUT_DIR / "review_queue.json"
    try:
        rq_path.write_text(json.dumps(review_queue, indent=2, default=str))
    except OSError as exc:
        logger.error("Failed to write review_queue.json: %s", exc)

    logger.info(
        "Wrote %d fund files | %d in review queue | index at %s",
        written, len(review_queue), idx_path,
    )


def build_outputs(
    matched: list[tuple[FundSignal, EntityMatch]],
    jobs_by_manager: dict[str, list[JobListing]],
    enrichment: dict[str, EnrichmentData],
) -> tuple[list[dict], list[dict]]:
    """
    Build all fund outputs.
    Returns (fund_outputs, review_queue).
    """
    fund_outputs: list[dict] = []
    review_queue: list[dict] = []

    for signal, entity in matched:
        manager = entity.manager_name or entity.normalized
        jobs    = jobs_by_manager.get(manager) or []
        enrich  = enrichment.get(manager)

        output = build_fund_output(signal, entity, jobs, enrich)

        if entity.review_flag:
            review_queue.append({
                "raw_name":    entity.raw_name,
                "normalized":  entity.normalized,
                "resolved_to": entity.manager_name,
                "confidence":  entity.confidence,
                "score":       entity.match_score,
                "method":      entity.match_method,
                "fund_vehicle":signal.entity_name,
                "file_date":   signal.file_date,
                "edgar_url":   signal.source_url,
            })
        else:
            fund_outputs.append(output)

    return fund_outputs, review_queue


if __name__ == "__main__":
    import pprint
    # Quick smoke-test with fake data
    from task1_entity_resolution import EntityResolver
    from task2_signal_scoring import FundSignal
    from task4_enrichment import EnrichmentData

    resolver = EntityResolver()
    entity   = resolver.resolve("Ares Capital Corporation")

    fake_signal = FundSignal(
        accession_no="0001234567-24-000001",
        cik="1234567",
        entity_name="Ares Capital Corporation",
        file_date="2024-11-15",
        form_type="D",
        days_since_filing=20,
        total_offering=850_000_000,
        total_sold=600_000_000,
        offering_status="open",
        strategy="Direct Lending",
        signal_score=8.5,
        state="DE",
        related_persons=[{"name": "John Smith", "roles": ["Chief Executive Officer"]}],
        source_url="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1234567",
    )

    fake_enrich = EnrichmentData(
        manager_name="Ares Management",
        aum_total=400_000_000_000,
        employee_count=2800,
        adv_cik="1555280",
        adv_date="2024-03-31",
        adv_source_url="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1555280&type=ADV",
        news=[],
        strategy_tags=["Direct Lending", "Private Credit"],
    )

    output = build_fund_output(fake_signal, entity, [], fake_enrich)
    pprint.pp(output)
