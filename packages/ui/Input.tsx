"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "sm" | "md";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", size = "md", ...props }, ref) => {
    const sizeStyles = size === "sm" ? "px-3 py-1.5 text-sm" : "px-3 py-2 text-sm";

    return (
      <input
        ref={ref}
        className={`w-full rounded-lg border border-border bg-background text-card-alt placeholder:text-muted-alt focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary ${sizeStyles} ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
