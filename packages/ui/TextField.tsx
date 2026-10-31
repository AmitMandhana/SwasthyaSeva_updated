"use client";

import { ReactNode, useId } from "react";

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password" | "email" | "number";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  icon?: ReactNode;
  unit?: string;
  className?: string;
  labelSuffix?: ReactNode;
  autoComplete?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  "data-testid"?: string;
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  disabled = false,
  error,
  icon,
  unit,
  className = "",
  labelSuffix,
  autoComplete,
  inputRef,
  "data-testid": testId,
}: TextFieldProps) {
  const inputId = useId();
  return (
    <div className={className}>
      <label htmlFor={inputId} className="flex items-center justify-between text-sm font-medium text-card-alt mb-2">
        <span>
          {label}
          {required && !error && <span aria-hidden="true" className="text-destructive ml-1">*</span>}
        </span>
        <span className="flex items-center gap-2">
          {error && (
            <span role="alert" data-testid={testId ? `${testId}-error` : undefined} className="text-destructive text-xs font-normal truncate max-w-[200px]" title={error}>
              {error}
            </span>
          )}
          {labelSuffix}
        </span>
      </label>
      <div className={`flex items-center border-2 rounded-md focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 ${error ? "border-destructive" : "border-input"} bg-background`}>
        {icon && <span className="pl-3 text-muted-alt flex items-center">{icon}</span>}
        <input
          ref={inputRef}
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          data-testid={testId}
          className={`flex-1 px-3 py-2 min-w-0 border-0 focus:outline-none focus:ring-0 bg-transparent text-card-alt rounded-md autofill:bg-transparent autofill:shadow-[0_0_0_30px_var(--background)_inset] ${icon ? "pl-2" : ""}`}
        />
        {unit && <span className="text-sm text-muted-alt pr-3">{unit}</span>}
      </div>
    </div>
  );
}
