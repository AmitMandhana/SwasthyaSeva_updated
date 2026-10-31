"use client";

export interface TabPillOption {
  key: string;
  label: string;
}

export interface TabPillMultiSelectProps {
  options: TabPillOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export function TabPillMultiSelect({
  options,
  selected,
  onChange,
  className = "",
}: TabPillMultiSelectProps) {
  function toggle(key: string) {
    onChange(
      selected.includes(key)
        ? selected.filter((k) => k !== key)
        : [...selected, key]
    );
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {options.map(({ key, label }) => {
        const isSelected = selected.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
              isSelected
                ? "bg-primary text-primary-alt"
                : "bg-muted text-card-alt hover:bg-muted/80"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
