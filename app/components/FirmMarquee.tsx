const FIRMS = [
  "Goldman Sachs", "Morgan Stanley", "Blackstone", "KKR", "Citadel", "JPMorgan",
  "Apollo", "Point72", "Millennium", "Jane Street", "Carlyle", "Bain Capital",
  "Evercore", "Centerview", "Ares", "Balyasny",
];

export default function FirmMarquee({ label = "Our readers prepare for roles at" }: { label?: string }) {
  const items = [...FIRMS, ...FIRMS]; // duplicated for a seamless loop
  return (
    <div className="w-full">
      {label && (
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b6478] mb-3">
          {label}
        </p>
      )}
      <div className="marquee-mask overflow-hidden">
        <div className="marquee-track flex w-max gap-10 py-1">
          {items.map((firm, i) => (
            <span key={i} className="flex items-center gap-10 whitespace-nowrap">
              <span className="text-sm font-extrabold tracking-tight text-[#6f6882]">
                {firm}
              </span>
              <span className="h-1 w-1 rounded-full bg-[#E9C989]/50" aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
