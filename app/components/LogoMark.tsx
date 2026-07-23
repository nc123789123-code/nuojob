export default function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <defs>
        <clipPath id="onlu-clip">
          <circle cx="14" cy="14" r="12.5" />
        </clipPath>
      </defs>
      {/* dark disc so the bands pop on any background */}
      <circle cx="14" cy="14" r="12.5" fill="#0A0710" />
      {/* violet base */}
      <path
        d="M 1 21 Q 9 18 27 15.5 L 27 28 L 1 28 Z"
        fill="#8B5CF6"
        clipPath="url(#onlu-clip)"
      />
      {/* fuchsia band */}
      <path
        d="M 1 17.5 Q 9 14.5 27 12 L 27 15.5 Q 9 18 1 21 Z"
        fill="#EC4899"
        clipPath="url(#onlu-clip)"
      />
      {/* gold band */}
      <path
        d="M 1 14.5 Q 9 11.5 27 9 L 27 12 Q 9 14.5 1 17.5 Z"
        fill="#F5B544"
        clipPath="url(#onlu-clip)"
      />
      {/* champagne-gold ring */}
      <circle cx="14" cy="14" r="12.5" stroke="#E9C989" strokeWidth="1.1" fill="none" />
    </svg>
  );
}
