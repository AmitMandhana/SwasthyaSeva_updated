"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@swasthyaseva/ui";
import { componentTestSpec } from '@swasthyaseva/test-gen';

function getTokenTimes(token: string): { iat: number; exp: number } | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.iat || !payload.exp) return null;
    return { iat: payload.iat * 1000, exp: payload.exp * 1000 };
  } catch {
    return null;
  }
}

export default function SessionBar() {
  const { token } = useAuth();
  const [pct, setPct] = useState<number | null>(null);

  useEffect(() => {
    if (!token) { setPct(null); return; }

    function update() {
      if (!token) return;
      const times = getTokenTimes(token);
      if (!times) { setPct(null); return; }
      const { iat, exp } = times;
      const total = exp - iat;
      if (total <= 0) { setPct(null); return; }
      const remaining = exp - Date.now();
      setPct(Math.max(0, Math.min(100, (remaining / total) * 100)));
    }

    update();
    const id = setInterval(update, 5000);
    return () => clearInterval(id);
  }, [token]);

  if (pct === null) return null;

  // Full-width bar, no transparency. Uses theme CSS variables.
  // Left = --primary (brand blue), right shifts: --accent → --warning → --destructive.
  const rightColor = pct > 60
    ? "var(--accent)"
    : pct > 30
    ? "var(--warning)"
    : "var(--destructive)";
  const blendStart = Math.max(0, pct - 8);
  const gradient = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${blendStart}%, ${rightColor} ${pct}%, ${rightColor} 100%)`;

  return (
    <div
      data-testid="session-bar"
      className="fixed top-0 left-0 right-0 h-[3px] z-[9999] pointer-events-none"
      style={{
        background: gradient,
        transition: "background 1000ms linear",
      }}
    />
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'admin',
  title: 'Session Timer Bar',
  elements: {
    sessionBar: { testId: 'session-bar' },
  },
  flows: [
    {
      name: 'display session bar when authenticated',
      steps: [
        { expect: 'visible', on: 'sessionBar' },
      ],
    },
  ],
});
