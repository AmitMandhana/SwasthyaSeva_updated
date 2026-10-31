'use client';

import { componentTestSpec } from '@swasthyaseva/test-gen';

type Props = {
  completed: number;
  resolved: number;
  unresolved: number;
  size?: number;
  showTestId?: boolean;
};

export default function DayIndicator({ completed, resolved, unresolved, size = 20, showTestId = false }: Props) {
  const total = completed + resolved + unresolved;
  if (total === 0) return null;

  const r = size / 2;
  const strokeWidth = size * 0.2;
  const radius = r - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  const completedPct = completed / total;
  const resolvedPct = resolved / total;
  const unresolvedPct = unresolved / total;

  const completedLen = completedPct * circumference;
  const resolvedLen = resolvedPct * circumference;
  const unresolvedLen = unresolvedPct * circumference;

  const completedOffset = 0;
  const resolvedOffset = -completedLen;
  const unresolvedOffset = -(completedLen + resolvedLen);

  return (
    <svg data-testid={showTestId ? 'day-indicator-svg' : undefined} width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {/* Background track */}
      <circle cx={r} cy={r} r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />

      {/* Green = completed */}
      {completedLen > 0 && (
        <circle
          data-testid={showTestId ? 'day-indicator-completed' : undefined}
          cx={r} cy={r} r={radius}
          fill="none"
          stroke="#22c55e"
          strokeWidth={strokeWidth}
          strokeDasharray={`${completedLen} ${circumference - completedLen}`}
          strokeDashoffset={completedOffset}
          transform={`rotate(-90 ${r} ${r})`}
          strokeLinecap="round"
        />
      )}

      {/* Grey = resolved */}
      {resolvedLen > 0 && (
        <circle
          data-testid={showTestId ? 'day-indicator-resolved' : undefined}
          cx={r} cy={r} r={radius}
          fill="none"
          stroke="#6b7280"
          strokeWidth={strokeWidth}
          strokeDasharray={`${resolvedLen} ${circumference - resolvedLen}`}
          strokeDashoffset={resolvedOffset}
          transform={`rotate(-90 ${r} ${r})`}
          strokeLinecap="round"
        />
      )}

      {/* Yellow = unresolved */}
      {unresolvedLen > 0 && (
        <circle
          data-testid={showTestId ? 'day-indicator-unresolved' : undefined}
          cx={r} cy={r} r={radius}
          fill="none"
          stroke="#eab308"
          strokeWidth={strokeWidth}
          strokeDasharray={`${unresolvedLen} ${circumference - unresolvedLen}`}
          strokeDashoffset={unresolvedOffset}
          transform={`rotate(-90 ${r} ${r})`}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/appointments',
  app: 'doctor',
  title: 'Day Indicator',
  elements: {
    svgIndicator: { testId: 'day-indicator-svg' },
    completedArc: { testId: 'day-indicator-completed' },
    resolvedArc: { testId: 'day-indicator-resolved' },
    unresolvedArc: { testId: 'day-indicator-unresolved' },
  },
  flows: [],
});
