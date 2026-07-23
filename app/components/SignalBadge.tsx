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
  "high-signal":      { cls: "bg-[#2E1620] text-[#FB7185] border-[#2A2438]",         label: "High Signal"           },
  "buildout":         { cls: "bg-[#14352A] text-[#5EE6B5] border-[#2A2438]", label: "Likely Buildout"    },
  "raising":          { cls: "bg-[#2A2113] text-[#F5B544] border-[#2A2438]",    label: "Raising Now"          },
  "fresh":            { cls: "bg-[#0F2033] text-[#7DD3FC] border-[#2A2438]",          label: "Just Posted"          },
  "direct":           { cls: "bg-[#0F2A2E] text-[#5EE6B5] border-[#2A2438]",       label: "Direct Posting"       },
  "backfill":         { cls: "bg-[#14101E] text-[#9A93AC] border-[#2A2438]",       label: "Backfill"             },
  "ib-transition":    { cls: "bg-[#161533] text-[#C4B5FD] border-[#2A2438]", label: "Good IB → Buyside"    },
  "buyside-preferred":{ cls: "bg-[#1E1633] text-[#C4B5FD] border-[#2A2438]", label: "Buyside Preferred"    },
  "selective":        { cls: "bg-[#2E1620] text-[#FB7185] border-[#2A2438]",       label: "Selective Team"        },
  "inferred":         { cls: "bg-[#14101E] text-[#9A93AC] border-[#2A2438]",       label: "EDGAR Inferred"       },
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
