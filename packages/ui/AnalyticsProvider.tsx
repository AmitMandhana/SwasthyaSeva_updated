"use client";

import React, { createContext, useContext, type ReactNode } from "react";

interface AnalyticsContextValue {
  trackEvent: (event: string, properties?: Record<string, unknown>) => void;
}

const noop = () => {};

const AnalyticsContext = createContext<AnalyticsContextValue>({ trackEvent: noop });

export function useAnalytics() {
  return useContext(AnalyticsContext);
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  return (
    <AnalyticsContext.Provider value={{ trackEvent: noop }}>
      {children}
    </AnalyticsContext.Provider>
  );
}
