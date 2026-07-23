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
  "high-signal":      { cls: "bg-[#2E1620] text-[#FB7185] border-[#38324E]",         label: "High Signal"           },
  "buildout":         { cls: "bg-[#14352A] text-[#5EE6B5] border-[#38324E]", label: "Likely Buildout"    },
  "raising":          { cls: "bg-[#2A2113] text-[#F5B544] border-[#38324E]",    label: "Raising Now"          },
  "fresh":            { cls: "bg-[#0F2033] text-[#7DD3FC] border-[#38324E]",          label: "Just Posted"          },
  "direct":           { cls: "bg-[#0F2A2E] text-[#5EE6B5] border-[#38324E]",       label: "Direct Posting"       },
  "backfill":         { cls: "bg-[#201B2E] text-[#9A93AC] border-[#38324E]",       label: "Backfill"             },
  "ib-transition":    { cls: "bg-[#161533] text-[#C4B5FD] border-[#38324E]", label: "Good IB → Buyside"    },
  "buyside-preferred":{ cls: "bg-[#1E1633] text-[#C4B5FD] border-[#38324E]", label: "Buyside Preferred"    },
  "selective":        { cls: "bg-[#2E1620] text-[#FB7185] border-[#38324E]",       label: "Selective Team"        },
  "inferred":         { cls: "bg-[#201B2E] text-[#9A93AC] border-[#38324E]",       label: "EDGAR Inferred"       },
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
