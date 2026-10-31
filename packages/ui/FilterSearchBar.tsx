"use client";

import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from "react";

export interface FilterDef {
  key: string;
  label: string;
  color?: string;
  suggestions?: string[];
}

export interface ParsedFilters {
  filters: Record<string, string>;
  search: string;
}

interface FilterChip {
  key: string;
  value: string;
}

export interface FilterSearchBarProps {
  filterDefs: FilterDef[];
  placeholder?: string;
  onSearch: (parsed: ParsedFilters) => void;
  onSearchStart?: () => void;
  debounceMs?: number;
  "data-testid"?: string;
}

const CHIP_COLORS: Record<string, string> = {
  blue: "bg-primary/15 text-primary border-primary/30",
  green: "bg-success/15 text-success border-success/30",
  purple: "bg-accent/15 text-accent border-accent/30",
  amber: "bg-warning/15 text-warning border-warning/30",
  red: "bg-destructive/15 text-destructive border-destructive/30",
  cyan: "bg-info/15 text-info border-info/30",
};

function getChipClass(color?: string): string {
  return CHIP_COLORS[color ?? "blue"] ?? CHIP_COLORS.blue;
}

export function FilterSearchBar({
  filterDefs,
  placeholder = "Search or type filter:value...",
  onSearch,
  onSearchStart,
  debounceMs = 1000,
  "data-testid": testId,
}: FilterSearchBarProps) {
  const [chips, setChips] = useState<FilterChip[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filterKeys = filterDefs.map((f) => f.key);

  const emitSearch = useCallback(
    (currentChips: FilterChip[], freeText: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const filters: Record<string, string> = {};
        for (const c of currentChips) {
          filters[c.key] = c.value;
        }
        onSearch({ filters, search: freeText.trim() });
      }, debounceMs);
    },
    [onSearch, debounceMs]
  );

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function addChip(key: string, value: string) {
    const next = chips.filter((c) => c.key !== key).concat({ key, value });
    setChips(next);
    setInputValue("");
    setShowSuggestions(false);
    onSearchStart?.();
    emitSearch(next, "");
    inputRef.current?.focus();
  }

  function removeChip(key: string) {
    const next = chips.filter((c) => c.key !== key);
    setChips(next);
    onSearchStart?.();
    emitSearch(next, inputValue);
    inputRef.current?.focus();
  }

  // Detect if input is in "key:partial" mode for value suggestions
  function getActiveFilterKey(): { def: FilterDef; partial: string } | null {
    const colonIdx = inputValue.indexOf(":");
    if (colonIdx <= 0) return null;
    const candidateKey = inputValue.slice(0, colonIdx).trim().toLowerCase();
    const def = filterDefs.find((f) => f.key === candidateKey && f.suggestions && f.suggestions.length > 0);
    if (!def) return null;
    const partial = inputValue.slice(colonIdx + 1).toLowerCase();
    return { def, partial };
  }

  function handleInputChange(val: string) {
    setInputValue(val);
    setShowSuggestions(true);
    onSearchStart?.();
    emitSearch(chips, val);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = inputValue.trim();
      if (!val) return;

      // Check for filter:value pattern
      const colonIdx = val.indexOf(":");
      if (colonIdx > 0 && colonIdx < val.length - 1) {
        const key = val.slice(0, colonIdx).toLowerCase();
        const value = val.slice(colonIdx + 1);
        if (filterKeys.includes(key)) {
          addChip(key, value);
          return;
        }
      }

      // Free text search - emit immediately
      if (timerRef.current) clearTimeout(timerRef.current);
      const filters: Record<string, string> = {};
      for (const c of chips) filters[c.key] = c.value;
      onSearch({ filters, search: val });
      setShowSuggestions(false);
    } else if (e.key === "Backspace" && !inputValue && chips.length > 0) {
      // Remove last chip on backspace with empty input
      const last = chips[chips.length - 1];
      removeChip(last.key);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  function handleSuggestionClick(key: string) {
    setInputValue(key + ":");
    setShowSuggestions(true);
    inputRef.current?.focus();
  }

  function handleValueSuggestionClick(key: string, value: string) {
    addChip(key, value);
  }

  // Filter suggestions based on current input
  const availableFilters = filterDefs.filter(
    (f) => !chips.some((c) => c.key === f.key) && (!inputValue || f.key.startsWith(inputValue.toLowerCase()) || f.label.toLowerCase().includes(inputValue.toLowerCase()))
  );

  const defMap = new Map(filterDefs.map((f) => [f.key, f]));

  return (
    <div ref={containerRef} className="relative flex-1">
      <div
        className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg border border-border bg-background text-card-alt focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Search icon */}
        <svg
          className="w-4 h-4 text-muted-alt shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {/* Chips */}
        {chips.map((chip) => {
          const def = defMap.get(chip.key);
          return (
            <span
              key={chip.key}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${getChipClass(def?.color)}`}
            >
              <span className="opacity-70">{def?.label ?? chip.key}:</span>
              <span>{chip.value}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeChip(chip.key);
                }}
                className="ml-0.5 opacity-60 hover:opacity-100"
              >
                &times;
              </button>
            </span>
          );
        })}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (availableFilters.length > 0) setShowSuggestions(true);
          }}
          placeholder={chips.length === 0 ? placeholder : "Add filter..."}
          data-testid={testId}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-alt"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (() => {
        const active = getActiveFilterKey();
        if (active) {
          // Show value suggestions for the active filter
          const filtered = active.def.suggestions!.filter((s) =>
            s.toLowerCase().includes(active.partial)
          );
          if (filtered.length === 0) return null;
          return (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-alt font-semibold">
                {active.def.label} values
              </div>
              {filtered.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                  onClick={() => handleValueSuggestionClick(active.def.key, v)}
                >
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${getChipClass(active.def.color)}`}>
                    {v}
                  </span>
                </button>
              ))}
            </div>
          );
        }
        // Show filter key suggestions
        if (availableFilters.length === 0) return null;
        return (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-lg z-50 py-1">
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-alt font-semibold">
              Available Filters
            </div>
            {availableFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                onClick={() => handleSuggestionClick(f.key)}
              >
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${getChipClass(f.color)}`}
                >
                  {f.key}
                </span>
                <span className="text-card-alt">{f.label}</span>
              </button>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
