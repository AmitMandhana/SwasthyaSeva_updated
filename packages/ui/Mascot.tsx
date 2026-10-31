"use client";

interface MascotProps {
  size?: number;
  className?: string;
}

export function Mascot({ size = 48, className = "" }: MascotProps) {
  const id = `mascot-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Gradient for petals */}
        <linearGradient id={`${id}-petal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.4" />
        </linearGradient>
        {/* Radial glow for center */}
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
        {/* Accent gradient for cross */}
        <linearGradient id={`${id}-cross`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Outer glow */}
      <circle cx="40" cy="36" r="28" fill={`url(#${id}-glow)`} />

      {/* Back petals (outer layer — wider, more transparent) */}
      <path d="M40 6c-3 8-4 16-2 24 2-8 3-16 2-24Z" fill={`url(#${id}-petal)`} opacity="0.3" />
      <path d="M10 28c6 6 14 10 22 10-6-2-14-6-22-10Z" fill={`url(#${id}-petal)`} opacity="0.2" />
      <path d="M70 28c-6 6-14 10-22 10 6-2 14-6 22-10Z" fill={`url(#${id}-petal)`} opacity="0.2" />
      <path d="M16 40c8 2 16 2 24 0-8-1-16 0-24 0Z" fill={`url(#${id}-petal)`} opacity="0.15" />
      <path d="M64 40c-8 2-16 2-24 0 8-1 16 0 24 0Z" fill={`url(#${id}-petal)`} opacity="0.15" />

      {/* Middle petals (main layer) */}
      <path d="M40 10c-4 8-5 16-1 24 4-8 5-16 1-24Z" fill={`url(#${id}-petal)`} opacity="0.7" />
      <path d="M18 24c4 7 10 12 18 14-5-4-12-8-18-14Z" fill={`url(#${id}-petal)`} opacity="0.5" />
      <path d="M62 24c-4 7-10 12-18 14 5-4 12-8 18-14Z" fill={`url(#${id}-petal)`} opacity="0.5" />

      {/* Inner petals (front layer — brighter, smaller) */}
      <path d="M40 14c-3 6-3 14 0 20 3-6 3-14 0-20Z" fill="var(--primary)" opacity="0.85" />
      <path d="M24 26c3 5 8 9 14 10-4-3-9-6-14-10Z" fill="var(--primary)" opacity="0.6" />
      <path d="M56 26c-3 5-8 9-14 10 4-3 9-6 14-10Z" fill="var(--primary)" opacity="0.6" />

      {/* Center circle (behind cross) */}
      <circle cx="40" cy="35" r="7" fill="var(--card)" opacity="0.15" />

      {/* Health cross — refined with rounded caps */}
      <rect x="37.5" y="28" width="5" height="14" rx="2" fill={`url(#${id}-cross)`} />
      <rect x="33" y="32.5" width="14" height="5" rx="2" fill={`url(#${id}-cross)`} />

      {/* Decorative dots at petal tips */}
      <circle cx="40" cy="12" r="1.2" fill="var(--primary)" opacity="0.5" />
      <circle cx="22" cy="24" r="1" fill="var(--primary)" opacity="0.4" />
      <circle cx="58" cy="24" r="1" fill="var(--primary)" opacity="0.4" />
      <circle cx="14" cy="38" r="0.8" fill="var(--primary)" opacity="0.3" />
      <circle cx="66" cy="38" r="0.8" fill="var(--primary)" opacity="0.3" />

      {/* Base arc with detail */}
      <path
        d="M22 50q8 4 18 4t18-4"
        stroke="var(--primary)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.3"
        strokeLinecap="round"
      />
      <path
        d="M28 52q6 2 12 2t12-2"
        stroke="var(--primary)"
        strokeWidth="1"
        fill="none"
        opacity="0.2"
        strokeLinecap="round"
      />

      {/* Text baseline decorative line */}
      <line x1="30" y1="58" x2="50" y2="58" stroke="var(--primary)" strokeWidth="0.5" opacity="0.15" strokeLinecap="round" />
    </svg>
  );
}
