// ─── SignalBadge ──────────────────────────────────────────────────────────────
// Reusable intelligence annotation badge for job cards and firm pages.

export type SignalBadgeVariant =
  | "high-signal"
  | "buildout"
  | "raising"
  | "fresh"
  | "direct"
  | "backfill"
  | "ib-transition"
  | "buyside-preferred"
  | "selective"
  | "inferred";

const VARIANTS: Record<SignalBadgeVariant, { cls: string; label: string }> = {
  "high-signal":      { cls: "bg-red-50 text-red-700 border-red-200",         label: "High Signal"           },
  "buildout":         { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Likely Buildout"    },
  "raising":          { cls: "bg-amber-50 text-amber-700 border-amber-200",    label: "Raising Now"          },
  "fresh":            { cls: "bg-sky-50 text-sky-700 border-sky-200",          label: "Just Posted"          },
  "direct":           { cls: "bg-teal-50 text-teal-700 border-teal-200",       label: "Direct Posting"       },
  "backfill":         { cls: "bg-gray-50 text-gray-600 border-gray-200",       label: "Backfill"             },
  "ib-transition":    { cls: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Good IB → Buyside"    },
  "buyside-preferred":{ cls: "bg-violet-50 text-violet-700 border-violet-200", label: "Buyside Preferred"    },
  "selective":        { cls: "bg-rose-50 text-rose-700 border-rose-200",       label: "Selective Team"        },
  "inferred":         { cls: "bg-gray-50 text-gray-500 border-gray-200",       label: "EDGAR Inferred"       },
};

interface SignalBadgeProps {
  variant: SignalBadgeVariant;
  className?: string;
}

export default function SignalBadge({ variant, className = "" }: SignalBadgeProps) {
  const { cls, label } = VARIANTS[variant];
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full border ${cls} ${className}`}>
      {label}
    </span>
  );
}
