"use client";

import { type ReactNode } from "react";

export interface SegmentedControlOption {
  value: string;
  label?: string;
  icon?: ReactNode;
  "data-testid"?: string;
}

export interface SegmentedControlProps {
  value: string;
  onChange: (value: string) => void;
  options: SegmentedControlOption[];
  size?: "sm" | "md";
}

export function SegmentedControl({ value, onChange, options, size = "md" }: SegmentedControlProps) {
  const sizeStyles = size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm";

  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          data-testid={opt["data-testid"]}
          onClick={() => onChange(opt.value)}
          className={`${sizeStyles} font-medium transition-colors ${
            value === opt.value
              ? "bg-primary text-primary-alt"
              : "bg-card text-muted-alt hover:text-card-alt"
          }`}
        >
          {opt.icon ?? opt.label ?? opt.value}
        </button>
      ))}
    </div>
  );
}
