"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";

export type UsernameStatus = "idle" | "checking" | "available" | "taken";

export interface UseUsernameAvailabilityOptions {
  enabled?: boolean;
  debounceMs?: number;
}

export interface UseUsernameAvailabilityReturn {
  status: UsernameStatus;
  statusLabel: ReactNode;
}

export function useUsernameAvailability(
  username: string,
  checkFn: (username: string) => Promise<{ available: boolean }>,
  options: UseUsernameAvailabilityOptions = {},
): UseUsernameAvailabilityReturn {
  const { enabled = true, debounceMs = 600 } = options;
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) { setStatus("idle"); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    const val = username.trim();
    if (val.length < 3) { setStatus("idle"); return; }
    setStatus("checking");
    timerRef.current = setTimeout(async () => {
      try {
        const res = await checkFn(val);
        setStatus(res.available ? "available" : "taken");
      } catch { setStatus("idle"); }
    }, debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [username, enabled, checkFn, debounceMs]);

  const statusLabel: ReactNode = status !== "idle" ? (
    <span className={`text-xs ${status === "available" ? "text-success" : status === "taken" ? "text-destructive" : "text-muted-alt"}`}>
      {status === "checking" ? "Checking..." : status === "available" ? "✓ Available" : "✗ Already taken"}
    </span>
  ) : null;

  return { status, statusLabel };
}
