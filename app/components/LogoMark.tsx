export default function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <defs>
        <clipPath id="onlu-clip">
          <circle cx="14" cy="14" r="12.5" />
        </clipPath>
      </defs>
      {/* Salmon/peach bottom fill */}
      <path
        d="M 1 21 Q 9 18 27 15.5 L 27 28 L 1 28 Z"
        fill="#f0b2a0"
        clipPath="url(#onlu-clip)"
      />
      {/* Lavender band */}
      <path
        d="M 1 17.5 Q 9 14.5 27 12 L 27 15.5 Q 9 18 1 21 Z"
        fill="#c4b0de"
        clipPath="url(#onlu-clip)"
      />
      {/* Mint green band */}
      <path
        d="M 1 14.5 Q 9 11.5 27 9 L 27 12 Q 9 14.5 1 17.5 Z"
        fill="#9ecfc0"
        clipPath="url(#onlu-clip)"
      />
      {/* Circle outline */}
      <circle cx="14" cy="14" r="12.5" stroke="#e8a898" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
