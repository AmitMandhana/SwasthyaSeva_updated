"use client";

type Variant = "heartbeat" | "dna" | "shield";

interface HealthIllustrationProps {
  variant: Variant;
  size?: number;
  className?: string;
}

function HeartbeatSVG({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 0.4} viewBox="0 0 320 128" fill="none" aria-hidden="true">
      {/* ECG / heartbeat line */}
      <polyline
        points="0,64 60,64 80,64 95,20 110,108 125,40 140,80 155,64 200,64 220,64 235,20 250,108 265,40 280,80 295,64 320,64"
        stroke="var(--primary)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
      {/* Faint duplicate for glow effect */}
      <polyline
        points="0,64 60,64 80,64 95,20 110,108 125,40 140,80 155,64 200,64 220,64 235,20 250,108 265,40 280,80 295,64 320,64"
        stroke="var(--primary)"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.08"
      />
    </svg>
  );
}

function DNASVG({ size }: { size: number }) {
  const h = size;
  const w = size * 0.5;
  return (
    <svg width={w} height={h} viewBox="0 0 60 120" fill="none" aria-hidden="true">
      {/* Left strand */}
      <path
        d="M10,10 Q30,30 10,50 Q30,70 10,90 Q30,110 10,120"
        stroke="var(--primary)"
        strokeWidth="2"
        fill="none"
        opacity="0.5"
        strokeLinecap="round"
      />
      {/* Right strand */}
      <path
        d="M50,10 Q30,30 50,50 Q30,70 50,90 Q30,110 50,120"
        stroke="var(--primary)"
        strokeWidth="2"
        fill="none"
        opacity="0.5"
        strokeLinecap="round"
      />
      {/* Cross-bars */}
      {[20, 40, 60, 80, 100].map((y) => (
        <line
          key={y}
          x1="18" y1={y} x2="42" y2={y}
          stroke="var(--accent)"
          strokeWidth="1.5"
          opacity="0.3"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function ShieldSVG({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {/* Shield outline */}
      <path
        d="M32 6L8 18v16c0 14 10 22 24 26 14-4 24-12 24-26V18L32 6Z"
        stroke="var(--primary)"
        strokeWidth="2"
        fill="var(--primary)"
        fillOpacity="0.06"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Health cross */}
      <rect x="29" y="22" width="6" height="20" rx="2" fill="var(--primary)" opacity="0.6" />
      <rect x="22" y="29" width="20" height="6" rx="2" fill="var(--primary)" opacity="0.6" />
    </svg>
  );
}

export function HealthIllustration({ variant, size = 120, className = "" }: HealthIllustrationProps) {
  return (
    <div className={className}>
      {variant === "heartbeat" && <HeartbeatSVG size={size} />}
      {variant === "dna" && <DNASVG size={size} />}
      {variant === "shield" && <ShieldSVG size={size} />}
    </div>
  );
}
