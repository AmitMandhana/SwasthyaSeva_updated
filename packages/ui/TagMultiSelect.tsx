"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";

export interface TagOption {
  value: string;
  label: string;
}

export interface TagMultiSelectProps {
  options: TagOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  allowCustom?: boolean;
}

export function TagMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Filter by tags...",
  className = "",
  allowCustom = false,
}: TagMultiSelectProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const updatePosition = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDropdownStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 260),
        zIndex: 9999,
        position: "fixed",
      });
    }
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(t) &&
        dropdownRef.current && !dropdownRef.current.contains(t)
      ) close();
    }
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, close, updatePosition]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  }

  function addCustom() {
    const trimmed = search.trim();
    if (!trimmed || selected.includes(trimmed)) return;
    onChange([...selected, trimmed]);
    setSearch("");
  }

  function removeChip(value: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(selected.filter((v) => v !== value));
  }

  const selectedLabels = selected
    .map((v) => options.find((o) => o.value === v)?.label ?? v)
    .filter(Boolean) as string[];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        data-testid="tag-filter-combobox"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center w-full min-h-9 border rounded-md bg-background transition-colors px-2 gap-1.5 flex-wrap ${
          open ? "border-primary ring-2 ring-inset ring-primary" : "border-input"
        }`}
      >
        {selectedLabels.length === 0 ? (
          <span className="text-sm text-muted-alt flex-1 text-left py-1">{placeholder}</span>
        ) : (
          <>
            {selectedLabels.slice(0, 3).map((label, i) => (
              <span
                key={selected[i]}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/15 text-primary text-xs font-medium border border-primary/20"
              >
                {label}
                <X size={10} onClick={(e) => removeChip(selected[i], e)} className="cursor-pointer hover:text-destructive" />
              </span>
            ))}
            {selectedLabels.length > 3 && (
              <span className="text-xs text-muted-alt">+{selectedLabels.length - 3} more</span>
            )}
          </>
        )}
        <span className="ml-auto pl-1 text-muted-alt shrink-0">
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          className="rounded-md border border-border bg-card shadow-lg"
          style={dropdownStyle}
        >
          <div className="p-2 border-b border-border flex items-center gap-2">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") close(); if (e.key === "Enter" && allowCustom && search.trim() && filtered.length === 0) { e.preventDefault(); addCustom(); } }}
              placeholder="Search tags..."
              className="flex-1 px-2 py-1.5 text-sm rounded border border-border bg-background text-card-alt focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {selected.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="text-xs text-muted-alt hover:text-destructive whitespace-nowrap"
              >
                Clear all
              </button>
            )}
          </div>
          <ul id={listboxId} role="listbox" aria-multiselectable="true" className="max-h-52 overflow-y-auto py-1">
            {filtered.map((opt) => {
              const isSelected = selected.includes(opt.value);
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  data-testid={`tag-option-${opt.value}`}
                  onClick={() => toggle(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-card-alt hover:bg-muted"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-primary border-primary" : "border-input"
                  }`}>
                    {isSelected && (
                      <svg viewBox="0 0 10 8" width="8" height="8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {opt.label}
                </li>
              );
            })}
            {filtered.length === 0 && (
              allowCustom && search.trim() ? (
                <li
                  onClick={addCustom}
                  className="px-3 py-2 text-sm cursor-pointer text-primary hover:bg-muted transition-colors"
                >
                  + Add &ldquo;{search.trim()}&rdquo;
                </li>
              ) : (
                <li className="px-3 py-2 text-sm text-muted-alt">No results</li>
              )
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}
