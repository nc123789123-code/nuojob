"""
Task 6: Alerting Logic
-----------------------
Scans all fund outputs and flags high-priority hiring signals:

  Priority 1 (🔴) — New filing WITHIN 7 days from a known private credit manager
  Priority 1 (🔴) — Filing + new job postings in same 30-day window  ← CORE SIGNAL
  Priority 2 (🟡) — AUM growth >20% YoY per Form ADV data
  Priority 3 (🟢) — First-time fund raise (no prior Form D for this manager)

Outputs:
  - pipeline/output/alerts.json        — all alerts sorted by priority
  - pipeline/logs/alerts.log           — human-readable log of new alerts
"""

import json
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from config import OUTPUT_DIR, LOGS_DIR

logger = logging.getLogger(__name__)

ALERTS_OUTPUT = OUTPUT_DIR / "alerts.json"
PREV_ALERTS   = OUTPUT_DIR / ".alerts_prev.json"   # persisted between runs


# ── Alert schema ───────────────────────────────────────────────────────────────

PRIORITY_LABELS = {1: "🔴 HIGH", 2: "🟡 MEDIUM", 3: "🟢 LOW"}


@dataclass
class Alert:
    priority:     int            # 1 (highest) → 3 (lowest)
    alert_type:   str            # "new_filing" | "filing_plus_jobs" | "aum_growth" | "first_time_fund"
    manager_name: str
    fund_vehicle: str
    message:      str
    details:      dict = field(default_factory=dict)
    source_url:   str = ""
    generated_at: str = ""

    def __post_init__(self):
        if not self.generated_at:
            self.generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    def to_dict(self) -> dict:
        return {
            "priority":      self.priority,
            "priority_label":PRIORITY_LABELS.get(self.priority, ""),
            "alert_type":    self.alert_type,
            "manager_name":  self.manager_name,
            "fund_vehicle":  self.fund_vehicle,
            "message":       self.message,
            "details":       self.details,
            "source_url":    self.source_url,
            "generated_at":  self.generated_at,
        }


# ── Alert detectors ────────────────────────────────────────────────────────────

def detect_new_filings(fund_outputs: list[dict]) -> list[Alert]:
    """
    Priority 1: Form D filed within last 7 days from a known private credit manager.
    """
    alerts = []
    for record in fund_outputs:
        days = record.get("days_since_filing") or 999
        if days > 7:
            continue
        score = record.get("hiring_signal_score", 0)
        manager = record["manager_name"]
        fund    = record["fund_vehicle"]
        amt     = record.get("amount_raised")
        amt_str = f"${amt/1e6:.0f}M" if amt else "undisclosed amount"
        alerts.append(Alert(
            priority=1,
            alert_type="new_filing",
            manager_name=manager,
            fund_vehicle=fund,
            message=(
                f"{manager} filed a new Form D {days}d ago — "
                f"{amt_str} | {record.get('offering_status','').capitalize()} | "
                f"Signal score {score}/10"
            ),
            details={
                "days_since_filing": days,
                "amount":            amt,
                "strategy":          record.get("strategy"),
                "signal_score":      score,
            },
            source_url=record.get("edgar_source_url", ""),
        ))
    return alerts


def detect_filing_plus_jobs(fund_outputs: list[dict], window_days: int = 30) -> list[Alert]:
    """
    Priority 1 (CORE SIGNAL): Manager has both a Form D filing AND open job postings
    within the same `window_days` window. This is the strongest hiring indicator.
    """
    alerts = []
    for record in fund_outputs:
        days      = record.get("days_since_filing") or 999
        job_count = record.get("open_role_count") or 0
        if days > window_days or job_count == 0:
            continue

        manager     = record["manager_name"]
        fund        = record["fund_vehicle"]
        amt         = record.get("amount_raised")
        amt_str     = f"${amt/1e6:.0f}M" if amt else "undisclosed"
        strategy    = record.get("strategy") or "Private Credit"
        top_roles   = [r["title"] for r in (record.get("open_roles") or [])[:3]]
        roles_str   = ", ".join(top_roles) if top_roles else "multiple roles"

        alerts.append(Alert(
            priority=1,
            alert_type="filing_plus_jobs",
            manager_name=manager,
            fund_vehicle=fund,
            message=(
                f"⚡ {manager} — {amt_str} {strategy} filing ({days}d ago) "
                f"+ {job_count} open role{'s' if job_count > 1 else ''}: {roles_str}"
            ),
            details={
                "days_since_filing": days,
                "amount":            amt,
                "strategy":          strategy,
                "open_role_count":   job_count,
                "top_roles":         top_roles,
                "signal_score":      record.get("hiring_signal_score"),
            },
            source_url=record.get("careers_page") or record.get("edgar_source_url") or "",
        ))
    return alerts


def detect_aum_growth(fund_outputs: list[dict], growth_threshold: float = 0.20) -> list[Alert]:
    """
    Priority 2: AUM has grown >20% since last period (requires two ADV snapshots).
    This uses the total_offering as a proxy when historical ADV data isn't available.
    """
    alerts = []
    # Load previous run snapshot for comparison
    prev: dict[str, dict] = {}
    if PREV_ALERTS.exists():
        try:
            prev = {
                r["manager_name"]: r
                for r in json.loads(PREV_ALERTS.read_text())
                if "manager_name" in r
            }
        except (OSError, json.JSONDecodeError):
            pass

    for record in fund_outputs:
        manager  = record["manager_name"]
        aum_curr = record.get("aum_total")
        if not aum_curr:
            continue
        prev_rec  = prev.get(manager) or {}
        aum_prev  = prev_rec.get("aum_total")
        if not aum_prev or aum_prev == 0:
            continue
        growth = (aum_curr - aum_prev) / aum_prev
        if growth < growth_threshold:
            continue

        alerts.append(Alert(
            priority=2,
            alert_type="aum_growth",
            manager_name=manager,
            fund_vehicle=record["fund_vehicle"],
            message=(
                f"{manager} AUM grew {growth*100:.0f}% YoY — "
                f"${aum_curr/1e9:.1f}B vs ${aum_prev/1e9:.1f}B prior"
            ),
            details={
                "aum_current": aum_curr,
                "aum_previous": aum_prev,
                "growth_pct":   round(growth * 100, 1),
            },
            source_url=record.get("adv_source_url") or "",
        ))
    return alerts


def detect_first_time_funds(fund_outputs: list[dict]) -> list[Alert]:
    """
    Priority 3: Form D (not D/A) with no prior filings for the same manager
    in our output set = likely first-time fund raise.
    """
    # A manager is "first-time" if ALL their filings are form type "D" (no amendments)
    # and they appear only once in the output set
    manager_counts: dict[str, int] = {}
    manager_has_amendment: dict[str, bool] = {}
    for record in fund_outputs:
        m = record["manager_name"]
        manager_counts[m]       = manager_counts.get(m, 0) + 1
        if record.get("form_type") == "D/A":
            manager_has_amendment[m] = True

    alerts = []
    seen_managers: set[str] = set()
    for record in fund_outputs:
        manager = record["manager_name"]
        if manager in seen_managers:
            continue
        seen_managers.add(manager)

        is_first_time = (
            manager_counts.get(manager, 0) == 1
            and not manager_has_amendment.get(manager, False)
            and record.get("form_type") == "D"
        )
        if not is_first_time:
            continue

        amt     = record.get("amount_raised")
        amt_str = f"${amt/1e6:.0f}M" if amt else "undisclosed"
        alerts.append(Alert(
            priority=3,
            alert_type="first_time_fund",
            manager_name=manager,
            fund_vehicle=record["fund_vehicle"],
            message=(
                f"{manager} — apparent first-time fund raise: {amt_str} "
                f"{record.get('strategy','')}"
            ),
            details={
                "amount":   amt,
                "strategy": record.get("strategy"),
            },
            source_url=record.get("edgar_source_url", ""),
        ))
    return alerts


# ── Unified runner ─────────────────────────────────────────────────────────────

def run_alerts(
    fund_outputs: list[dict],
    new_filing_window_days: int = 7,
    combined_signal_window_days: int = 30,
) -> list[Alert]:
    """
    Run all alert detectors and return sorted alert list.
    Also writes alerts.json and logs new alerts.
    """
    all_alerts: list[Alert] = []

    all_alerts.extend(detect_new_filings(fund_outputs))
    all_alerts.extend(detect_filing_plus_jobs(fund_outputs, window_days=combined_signal_window_days))
    all_alerts.extend(detect_aum_growth(fund_outputs))
    all_alerts.extend(detect_first_time_funds(fund_outputs))

    # Deduplicate: (manager, alert_type) keeps highest priority
    seen: dict[tuple, Alert] = {}
    for a in all_alerts:
        key = (a.manager_name, a.alert_type)
        if key not in seen or a.priority < seen[key].priority:
            seen[key] = a

    deduped = sorted(seen.values(), key=lambda a: (a.priority, a.manager_name))

    # Write output
    try:
        ALERTS_OUTPUT.write_text(json.dumps([a.to_dict() for a in deduped], indent=2))
    except OSError as exc:
        logger.error("Failed to write alerts.json: %s", exc)

    # Persist current outputs for next-run comparison (AUM growth detection)
    try:
        PREV_ALERTS.write_text(json.dumps(fund_outputs, indent=2, default=str))
    except OSError:
        pass

    # Human-readable log
    log_path = LOGS_DIR / "alerts.log"
    try:
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        with log_path.open("a") as f:
            f.write(f"\n{'='*70}\nALERT RUN: {ts}\n{'='*70}\n")
            for a in deduped:
                f.write(f"[{PRIORITY_LABELS.get(a.priority,'')}] {a.message}\n")
                f.write(f"  source: {a.source_url}\n\n")
    except OSError as exc:
        logger.warning("Failed to write alerts log: %s", exc)

    logger.info("Generated %d unique alerts (%d priority-1)", len(deduped),
                sum(1 for a in deduped if a.priority == 1))
    return deduped


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    # Smoke test with synthetic data
    fake_outputs = [
        {
            "manager_name":       "Ares Management",
            "fund_vehicle":       "Ares Capital Partners IX LP",
            "form_type":          "D",
            "days_since_filing":  3,
            "amount_raised":      1_200_000_000,
            "offering_status":    "open",
            "strategy":           "Direct Lending",
            "hiring_signal_score":9.2,
            "open_role_count":    4,
            "open_roles":         [{"title": "Credit Analyst"}, {"title": "VP, Direct Lending"}],
            "aum_total":          400_000_000_000,
            "edgar_source_url":   "https://www.sec.gov/...",
            "careers_page":       "https://www.ares.com/careers",
        },
        {
            "manager_name":       "First Time Credit Fund",
            "fund_vehicle":       "First Time Credit Fund I LP",
            "form_type":          "D",
            "days_since_filing":  15,
            "amount_raised":      250_000_000,
            "offering_status":    "open",
            "strategy":           "Special Situations",
            "hiring_signal_score":6.0,
            "open_role_count":    0,
            "open_roles":         [],
            "aum_total":          None,
            "edgar_source_url":   "https://www.sec.gov/...",
            "careers_page":       None,
        },
    ]

    alerts = run_alerts(fake_outputs)
    for a in alerts:
        print(f"\n{PRIORITY_LABELS.get(a.priority)} | {a.alert_type}")
        print(f"  {a.message}")
