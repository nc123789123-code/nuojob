"""
Onlu Data Pipeline — Unified Runner
=====================================
Runs Tasks 1-6 in sequence and produces:

  pipeline/output/<manager>__<acc>.json   — one JSON per fund vehicle
  pipeline/output/all_funds.json          — combined sorted index
  pipeline/output/alerts.json             — ranked hiring alerts
  pipeline/output/review_queue.json       — low-confidence entity matches
  pipeline/logs/pipeline.log              — execution log

Usage:
  python pipeline.py                   # last 90 days (default)
  python pipeline.py --days 30         # last 30 days only
  python pipeline.py --days 7          # fresh signals only (fastest)
  python pipeline.py --dry-run         # fetch + parse, don't write output
"""

import argparse
import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from config import OUTPUT_DIR, LOGS_DIR
from task1_entity_resolution import EntityResolver
from task2_signal_scoring import FundSignal, get_signals
from task3_job_matching import match_jobs_to_signals
from task4_enrichment import enrich_all
from task5_output import build_outputs, write_outputs
from task6_alerting import run_alerts


# ── Logging setup ──────────────────────────────────────────────────────────────

def _setup_logging(dry_run: bool) -> logging.Logger:
    log_path = LOGS_DIR / "pipeline.log"
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]
    if not dry_run:
        handlers.append(logging.FileHandler(log_path, encoding="utf-8"))
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
        datefmt="%H:%M:%S",
        handlers=handlers,
        force=True,
    )
    return logging.getLogger("pipeline")


# ── Pipeline ───────────────────────────────────────────────────────────────────

def run_pipeline(days_back: int = 90, dry_run: bool = False) -> dict:
    """
    Full pipeline execution.

    Args:
        days_back: How many calendar days of EDGAR filings to retrieve.
        dry_run:   If True, fetch and parse but skip writing output files.

    Returns:
        Summary stats dict.
    """
    log = _setup_logging(dry_run)
    started_at = time.monotonic()
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    log.info("━━━ Onlu pipeline starting ━━━  days_back=%d  dry_run=%s  %s",
             days_back, dry_run, ts)

    # ── Task 2: Fetch & score Form D signals ─────────────────────────────────
    log.info("[Task 2] Fetching EDGAR Form D filings…")
    t2_start = time.monotonic()
    signals: list[FundSignal] = get_signals(days_back=days_back)
    log.info("[Task 2] ✓  %d signals fetched in %.1fs", len(signals), time.monotonic() - t2_start)

    if not signals:
        log.warning("No signals returned — check EDGAR connectivity or widen date range.")
        return {"signals": 0, "funds_output": 0, "alerts": 0, "elapsed_s": 0}

    # ── Task 1: Resolve entity names ─────────────────────────────────────────
    log.info("[Task 1] Resolving %d entity names…", len(signals))
    t1_start  = time.monotonic()
    resolver  = EntityResolver()
    raw_names = [s.entity_name for s in signals]
    entities  = resolver.resolve_batch(raw_names)
    name_map  = {s.entity_name: e for s, e in zip(signals, entities)}

    high   = sum(1 for e in entities if e.confidence == "high")
    medium = sum(1 for e in entities if e.confidence == "medium")
    low    = sum(1 for e in entities if e.confidence == "low")
    review = sum(1 for e in entities if e.review_flag)
    log.info(
        "[Task 1] ✓  %d entities resolved in %.1fs  (high=%d medium=%d low=%d review=%d)",
        len(entities), time.monotonic() - t1_start, high, medium, low, review,
    )

    # Pair signals with their entity matches; drop unresolvable
    matched: list[tuple[FundSignal, object]] = []
    for signal in signals:
        entity = name_map[signal.entity_name]
        if entity.confidence == "low" and not entity.review_flag:
            log.debug("Skipping unresolvable: %s", signal.entity_name)
            continue
        matched.append((signal, entity))

    # Collect unique usable manager names for job+enrichment fetching
    usable_managers = list({
        e.manager_name
        for _, e in matched
        if e.manager_name and e.confidence != "low"
    })

    # ── Task 3: Match jobs ────────────────────────────────────────────────────
    log.info("[Task 3] Fetching jobs for %d managers…", len(usable_managers))
    t3_start = time.monotonic()
    jobs_by_manager = match_jobs_to_signals(usable_managers)
    total_jobs = sum(len(v) for v in jobs_by_manager.values())
    log.info("[Task 3] ✓  %d total relevant roles in %.1fs", total_jobs, time.monotonic() - t3_start)

    # Feed job counts back into signal scoring (score adjusts for open roles)
    for signal, entity in matched:
        mgr = entity.manager_name
        if mgr:
            job_count = len(jobs_by_manager.get(mgr) or [])
            if job_count > 0:
                from task2_signal_scoring import score_signal
                signal.signal_score = score_signal(
                    filing={"total_offering": signal.total_offering},
                    days_since_filing=signal.days_since_filing,
                    is_amendment=(signal.form_type == "D/A"),
                    open_role_count=job_count,
                )

    # ── Task 4: Enrich profiles ───────────────────────────────────────────────
    log.info("[Task 4] Enriching %d manager profiles…", len(usable_managers))
    t4_start    = time.monotonic()
    enrichment  = enrich_all(usable_managers)
    log.info("[Task 4] ✓  Enriched in %.1fs", time.monotonic() - t4_start)

    # ── Task 5: Build and write output ────────────────────────────────────────
    log.info("[Task 5] Building output records…")
    fund_outputs, review_queue = build_outputs(matched, jobs_by_manager, enrichment)
    log.info("[Task 5] ✓  %d fund records | %d in review queue",
             len(fund_outputs), len(review_queue))

    if not dry_run:
        write_outputs(fund_outputs, review_queue)

    # ── Task 6: Alerting ──────────────────────────────────────────────────────
    log.info("[Task 6] Running alert detection…")
    t6_start = time.monotonic()
    alerts   = run_alerts(fund_outputs) if not dry_run else []
    p1       = sum(1 for a in alerts if a.priority == 1)
    p2       = sum(1 for a in alerts if a.priority == 2)
    p3       = sum(1 for a in alerts if a.priority == 3)
    log.info("[Task 6] ✓  %d alerts (🔴 %d  🟡 %d  🟢 %d) in %.1fs",
             len(alerts), p1, p2, p3, time.monotonic() - t6_start)

    elapsed = time.monotonic() - started_at
    summary = {
        "run_at":          ts,
        "days_back":       days_back,
        "dry_run":         dry_run,
        "signals_fetched": len(signals),
        "entities_resolved":len(entities),
        "entities_review": review,
        "managers_fetched":len(usable_managers),
        "jobs_found":      total_jobs,
        "funds_output":    len(fund_outputs),
        "alerts_total":    len(alerts),
        "alerts_p1":       p1,
        "elapsed_s":       round(elapsed, 1),
    }

    log.info("━━━ Pipeline complete in %.1fs ━━━", elapsed)
    log.info("    Signals: %d | Funds: %d | Jobs: %d | Alerts: %d",
             len(signals), len(fund_outputs), total_jobs, len(alerts))

    # Write summary
    if not dry_run:
        summary_path = OUTPUT_DIR / "pipeline_summary.json"
        try:
            summary_path.write_text(json.dumps(summary, indent=2))
        except OSError:
            pass

    # Print high-priority alerts to stdout
    if alerts:
        print("\n" + "━" * 60)
        print(f"ALERTS ({len(alerts)} total)")
        print("━" * 60)
        for a in alerts[:10]:
            print(f"  {a.priority == 1 and '🔴' or a.priority == 2 and '🟡' or '🟢'}  {a.message}")
        if len(alerts) > 10:
            print(f"  … and {len(alerts) - 10} more — see alerts.json")
        print()

    return summary


# ── CLI entry point ────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Onlu data pipeline")
    parser.add_argument(
        "--days", type=int, default=90,
        help="Number of calendar days of EDGAR filings to retrieve (default: 90)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Fetch and parse data but do not write output files",
    )
    args = parser.parse_args()
    summary = run_pipeline(days_back=args.days, dry_run=args.dry_run)

    print("\nSummary:")
    for k, v in summary.items():
        print(f"  {k:<22s} {v}")


if __name__ == "__main__":
    main()
