"use client";

import { ReactNode, useState, useRef, useEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  icon?: ReactNode;
  className?: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "-- Select --",
  required = false,
  disabled = false,
  error,
  icon,
  className = "",
}: SelectFieldProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const updateDropdownPosition = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const dropdownHeight = Math.min(options.length * 36 + 48, 200);
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
      const top = placeAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4;
      setDropdownStyle({ top, left: rect.left, width: rect.width, zIndex: 9999, position: "fixed" });
    }
  }, [options.length]);

  const selected = options.find((o) => o.value === value);

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
    setHighlightIdx(-1);
  }, []);

  useEffect(() => {
    if (open) {
      updateDropdownPosition();
      function onClickOutside(e: MouseEvent) {
        const target = e.target as Node;
        if (
          containerRef.current && !containerRef.current.contains(target) &&
          dropdownRef.current && !dropdownRef.current.contains(target)
        ) {
          close();
        }
      }
      document.addEventListener("mousedown", onClickOutside);
      window.addEventListener("scroll", updateDropdownPosition, true);
      window.addEventListener("resize", updateDropdownPosition);
      return () => {
        document.removeEventListener("mousedown", onClickOutside);
        window.removeEventListener("scroll", updateDropdownPosition, true);
        window.removeEventListener("resize", updateDropdownPosition);
      };
    }
  }, [open, close, updateDropdownPosition]);

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIdx] as HTMLElement;
      if (el) {
        const list = listRef.current;
        const elTop = el.offsetTop;
        const elBottom = elTop + el.offsetHeight;
        if (elTop < list.scrollTop) list.scrollTop = elTop;
        else if (elBottom > list.scrollTop + list.clientHeight) list.scrollTop = elBottom - list.clientHeight;
      }
    }
  }, [highlightIdx]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIdx((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIdx((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIdx >= 0 && highlightIdx < filtered.length) {
          onChange(filtered[highlightIdx].value);
          close();
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
    }
  }

  function select(val: string) {
    onChange(val);
    close();
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <label className="flex items-center justify-between text-sm font-medium text-card-alt mb-2">
        <span>
          {label}
          {required && !error && <span aria-hidden="true" className="text-destructive ml-1">*</span>}
        </span>
        {error && (
          <span role="alert" className="text-destructive text-xs font-normal truncate max-w-[200px]" title={error}>
            {error}
          </span>
        )}
      </label>

      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(!open); }}
        onKeyDown={handleKeyDown}
        className={`flex items-center w-full border rounded-md transition-colors ${
          open ? "border-primary ring-2 ring-inset ring-primary" : error ? "border-destructive" : "border-input"
        } bg-background disabled:opacity-50`}
      >
        {icon && <span className="pl-3 text-muted-alt">{icon}</span>}
        <span className={`flex-1 text-left px-3 py-2 text-sm truncate ${icon ? "pl-2" : ""} ${selected ? "text-card-alt" : "text-muted-alt"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="pr-3 text-muted-alt">
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          className="rounded-md border border-border bg-card shadow-lg"
          style={dropdownStyle}
        >
          {options.length > 5 && (
            <div className="p-2 border-b border-border">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setHighlightIdx(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                aria-label="Search options"
                className="w-full px-2 py-1.5 text-sm rounded border border-border bg-background text-card-alt focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
          <ul
            id={listboxId}
            ref={listRef}
            className="max-h-48 overflow-y-auto py-1"
            role="listbox"
          >
            <li
              role="option"
              aria-selected={!value}
              onClick={() => select("")}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors text-muted-alt hover:bg-muted`}
            >
              {placeholder}
            </li>
            {filtered.map((opt, idx) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                onClick={() => select(opt.value)}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                  opt.value === value
                    ? "bg-primary/10 text-primary font-medium"
                    : idx === highlightIdx
                    ? "bg-muted text-card-alt"
                    : "text-card-alt hover:bg-muted"
                }`}
              >
                {opt.label}
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-alt">No results</li>
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}
