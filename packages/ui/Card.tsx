"use client";

import { ReactNode, useState } from "react";

export interface CardProps {
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

export function Card({
  title,
  icon,
  children,
  collapsible = false,
  defaultCollapsed = false,
  className = "",
}: CardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <section className={`bg-card p-6 rounded-xl border border-border/60 hover:border-border transition-colors ${className}`}>
      {(title || collapsible) && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-card-alt flex items-center gap-2">
            {icon && <span className="text-primary">{icon}</span>}
            {title}
          </h2>
          {collapsible && (
            <button
              type="button"
              aria-expanded={!isCollapsed}
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-card-alt hover:text-card-alt transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded"
            >
              <span
                className={`transform transition-transform duration-200 inline-block ${
                  isCollapsed ? "" : "rotate-90"
                }`}
              >
                ▶
              </span>
            </button>
          )}
        </div>
      )}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: collapsible && isCollapsed ? "0fr" : "1fr" }}
      >
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </section>
  );
}
