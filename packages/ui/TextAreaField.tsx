"use client";

import { ReactNode, useId } from "react";

export interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  rows?: number;
  maxLength?: number;
  icon?: ReactNode;
  className?: string;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  rows = 3,
  maxLength,
  icon,
  className = "",
  textareaRef,
}: TextAreaFieldProps) {
  const textareaId = useId();
  return (
    <div className={className}>
      <label htmlFor={textareaId} className="flex items-center justify-between text-sm font-medium text-card-alt mb-2">
        <span className="flex items-center gap-2">
          {icon && <span className="text-muted-alt">{icon}</span>}
          {label}
          {required && !error && <span aria-hidden="true" className="text-destructive ml-1">*</span>}
        </span>
        {error && (
          <span role="alert" className="text-destructive text-xs font-normal truncate max-w-[200px]" title={error}>
            {error}
          </span>
        )}
      </label>
      <textarea
        ref={textareaRef}
        id={textareaId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary ${error ? "border-destructive" : "border-input"} bg-background text-card-alt`}
      />
      {maxLength && (
        <p className={`text-xs mt-1 text-right ${value.length >= maxLength ? "text-destructive" : "text-muted-alt"}`}>
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
}
