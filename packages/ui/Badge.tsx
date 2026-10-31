"use client";

import { ReactNode } from "react";

export type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger";

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const variantStyles = {
    default: "bg-muted text-muted-alt",
    primary: "bg-primary text-primary-alt",
    success: "bg-success text-success-alt",
    warning: "bg-warning text-warning-alt",
    danger: "bg-destructive text-destructive-alt",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
