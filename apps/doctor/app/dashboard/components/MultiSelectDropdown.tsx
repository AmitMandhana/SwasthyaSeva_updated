'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import { componentTestSpec } from '@swasthyaseva/test-gen';

type Option = {
  value: number;
  label: string;
};

type Props = {
  options: Option[];
  selected: number[];
  onChange: (selected: number[]) => void;
  placeholder?: string;
  icon?: React.ReactNode;
};

export default function MultiSelectDropdown({ options, selected, onChange, placeholder = 'Select...', icon }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(value: number) {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  const selectedLabels = options.filter(o => selected.includes(o.value));

  return (
    <div ref={ref} className="relative">
      <button
        data-testid="multiselect-trigger"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-xs rounded-md border border-border bg-background text-card-alt hover:bg-muted/50 transition-colors min-w-0"
      >
        {icon}
        {selectedLabels.length === 0 ? (
          <span className="text-muted-alt">{placeholder}</span>
        ) : (
          <div className="flex items-center gap-1 min-w-0">
            {selectedLabels.slice(0, 2).map(o => (
              <span key={o.value} data-testid="multiselect-badge" className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] truncate max-w-24">
                {o.label}
              </span>
            ))}
            {selectedLabels.length > 2 && (
              <span className="text-[11px] text-muted-alt">+{selectedLabels.length - 2}</span>
            )}
          </div>
        )}
        {selected.length > 0 ? (
          <span
            data-testid="multiselect-clear"
            onClick={(e) => { e.stopPropagation(); onChange([]); }}
            className="text-muted-alt hover:text-card-alt ml-auto cursor-pointer"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown className="w-3 h-3 text-muted-alt ml-auto" />
        )}
      </button>

      {open && (
        <div data-testid="multiselect-panel" className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl w-56">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-background border border-border">
              <Search className="w-3 h-3 text-muted-alt shrink-0" />
              <input
                ref={inputRef}
                data-testid="multiselect-search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="text-xs bg-transparent outline-none text-card-alt placeholder:text-muted-alt w-full"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-alt text-center py-3">No results</p>
            ) : (
              filtered.map(o => (
                <button
                  key={o.value}
                  data-testid="multiselect-option"
                  onClick={() => toggle(o.value)}
                  className={`w-full text-left px-3 py-2 text-xs rounded transition-colors flex items-center gap-2 ${
                    selected.includes(o.value) ? 'bg-primary/10 text-primary' : 'text-card-alt hover:bg-muted'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                    selected.includes(o.value) ? 'bg-primary border-primary' : 'border-border'
                  }`}>
                    {selected.includes(o.value) && <span className="text-white text-[9px]">✓</span>}
                  </span>
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/consultation/test-id',
  app: 'doctor',
  title: 'Multi-Select Dropdown',
  elements: {
    triggerBtn: { testId: 'multiselect-trigger' },
    dropdownPanel: { testId: 'multiselect-panel' },
    searchInput: { testId: 'multiselect-search' },
    optionItems: { testId: 'multiselect-option' },
    selectedBadges: { testId: 'multiselect-badge' },
    clearAllBtn: { testId: 'multiselect-clear' },
    noResultsMsg: { text: 'No results' },
  },
  flows: [
    {
      name: 'open dropdown and select an option',
      steps: [
        { on: 'triggerBtn', do: 'click' },
        { on: 'dropdownPanel', expect: 'visible' },
        { on: 'optionItems', expect: 'countMin', value: 1 },
        { on: 'optionItems', do: 'click' },
        { on: 'selectedBadges', expect: 'countMin', value: 1 },
      ],
    },
    {
      name: 'search within dropdown',
      steps: [
        { on: 'triggerBtn', do: 'click' },
        { on: 'searchInput', do: 'fill', value: 'test' },
        { on: 'optionItems', expect: 'countMin', value: 0 },
      ],
    },
    {
      name: 'clear all selections',
      after: 'open dropdown and select an option',
      steps: [
        { on: 'clearAllBtn', do: 'click' },
        { on: 'selectedBadges', expect: 'hidden' },
      ],
    },
  ],
});
