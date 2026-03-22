import { FundFiling, OutreachRecord } from "@/app/types";

function formatCurrency(amount?: number): string {
  if (!amount) return "";
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  return `$${amount.toLocaleString()}`;
}

function escapeCsv(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(
  filings: FundFiling[],
  outreachRecords: Record<string, OutreachRecord>
): void {
  const headers = [
    "firm_name",
    "strategy",
    "state",
    "overall_score",
    "bucket",
    "confidence",
    "target_fund_size",
    "amount_raised",
    "offering_status",
    "latest_fund_signal",
    "latest_fund_signal_date",
    "form_type",
    "days_since_filing",
    "why_now",
    "recommended_outreach_reason",
    "suggested_target_function",
    "outreach_status",
    "notes",
    "edgar_url",
  ];

  const rows = filings.map((f) => {
    const outreach = outreachRecords[f.id];
    const edgarUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${f.cik}&type=D&dateb=&owner=include&count=40`;

    return [
      escapeCsv(f.entityName),
      escapeCsv(f.strategyLabel),
      escapeCsv(f.state),
      escapeCsv(f.score.overallScore),
      escapeCsv(f.score.bucket),
      escapeCsv(f.score.confidence),
      escapeCsv(formatCurrency(f.totalOfferingAmount)),
      escapeCsv(formatCurrency(f.totalAmountSold)),
      escapeCsv(f.offeringStatus),
      escapeCsv(`Form ${f.formType} filing`),
      escapeCsv(f.fileDate),
      escapeCsv(f.formType),
      escapeCsv(f.daysSinceFiling),
      escapeCsv(f.score.whyNow.join("; ")),
      escapeCsv(f.score.suggestedAngle),
      escapeCsv(f.score.suggestedTargetTeams.join(", ")),
      escapeCsv(outreach?.status || "not_contacted"),
      escapeCsv(outreach?.notes || ""),
      escapeCsv(edgarUrl),
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `buyside-fundraising-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
