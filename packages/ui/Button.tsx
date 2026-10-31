"use client";

import { ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "ghost" | "accent";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  icon?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  icon,
  className = "",
  "data-testid": testId,
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
  
  const variantStyles = {
    primary: "bg-primary text-primary-alt hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-alt hover:bg-secondary/80",
    danger: "bg-destructive text-destructive-alt hover:bg-destructive/90",
    success: "bg-success text-success-alt hover:bg-success/90",
    ghost: "bg-transparent text-foreground hover:bg-muted",
    accent: "bg-accent text-accent-alt hover:opacity-90",
  };

  const sizeStyles = {
    xs: "px-2 py-1 text-xs",
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon && <span className="shrink-0 flex">{icon}</span>}
      {children}
    </button>
  );
}
