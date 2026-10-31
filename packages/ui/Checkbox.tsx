"use client";

export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  label,
  checked,
  onChange,
  description,
  disabled = false,
  className = "",
}: CheckboxProps) {
  return (
    <div className={className}>
      <label className="flex items-start gap-2 cursor-pointer min-h-[44px] py-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary disabled:opacity-50"
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-card-alt">{label}</span>
          {description && <span className="text-xs text-muted-alt">{description}</span>}
        </div>
      </label>
    </div>
  );
}
