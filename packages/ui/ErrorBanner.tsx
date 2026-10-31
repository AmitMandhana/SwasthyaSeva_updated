"use client";

export interface ErrorBannerProps {
  message?: string | null;
  className?: string;
  "data-testid"?: string;
}

export function ErrorBanner({ message, className = "", "data-testid": testId }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <p data-testid={testId} className={`text-sm rounded-lg px-3 py-2 bg-destructive/10 text-destructive ${className}`} style={{ whiteSpace: "pre-line" }}>
      {message}
    </p>
  );
}
