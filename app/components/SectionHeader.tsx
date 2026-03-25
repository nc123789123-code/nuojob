import { ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: string;
  action?: ReactNode;
}

export default function SectionHeader({ eyebrow, title, description, badge, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-widest mb-1">{eyebrow}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-semibold text-gray-900 tracking-tight">{title}</h2>
          {badge && (
            <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{badge}</span>
          )}
        </div>
        {description && (
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
