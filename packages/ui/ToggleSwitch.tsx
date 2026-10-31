"use client";

export interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function ToggleSwitch({
  label,
  checked,
  onChange,
  disabled = false,
  className = "",
  "data-testid": testId,
}: ToggleSwitchProps) {
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer select-none min-h-[44px] ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        data-testid={testId}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
          checked ? "bg-primary" : "bg-muted-alt/40"
        }`}
      >
        <span
          className={`inline-block h-[18px] w-[18px] rounded-full bg-card shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-[22px]" : "translate-x-[3px]"
          }`}
        />
      </button>
      <span className="text-sm font-medium text-card-alt">{label}</span>
    </label>
  );
}
