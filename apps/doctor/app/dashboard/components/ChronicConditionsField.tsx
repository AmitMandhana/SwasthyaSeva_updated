'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Clock } from 'lucide-react';
import { Button } from '@swasthyaseva/ui';
import { chronicConditions } from '../constants/chronicConditions';
import { componentTestSpec } from '@swasthyaseva/test-gen';

interface Props {
  value: string[];
  onChange: (conditions: string[]) => void;
  onOpenHistory: () => void;
  isHistoryOpen?: boolean;
  readOnly?: boolean;
}

export default function ChronicConditionsField({ value, onChange, onOpenHistory, isHistoryOpen = false, readOnly }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filteredConditions, setFilteredConditions] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchTerm.trim()) {
        const filtered = chronicConditions.filter(
          (condition) =>
            condition.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !value.includes(condition)
        );
        setFilteredConditions(filtered);
      } else {
        setFilteredConditions([]);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, value]);

  const handleAddCondition = (condition: string) => {
    if (!value.includes(condition)) {
      onChange([...value, condition]);
    }
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const handleRemoveCondition = (condition: string) => {
    onChange(value.filter((c) => c !== condition));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-card-alt">Chronic Conditions</label>
        <Button
          data-testid="chronic-view-history"
          onClick={onOpenHistory}
          size="xs"
          icon={<Clock className="w-3.5 h-3.5" />}
        >
          {isHistoryOpen ? 'Close History' : 'View History'}
        </Button>
      </div>

      <div className="relative" ref={dropdownRef}>
        {!readOnly && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-alt" />
          <input
            type="text"
            data-testid="chronic-search"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Search conditions..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md text-card-alt placeholder-muted-alt focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary outline-none transition-colors"
          />
        </div>
        )}

        {isDropdownOpen && searchTerm.trim() && filteredConditions.length === 0 && (
          <div data-testid="chronic-no-results" className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg px-4 py-3 text-sm text-muted-alt">
            No conditions found
          </div>
        )}

        {isDropdownOpen && filteredConditions.length > 0 && (
          <div data-testid="chronic-dropdown" className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filteredConditions.map((condition, cIdx) => (
              <button
                key={condition}
                type="button"
                data-testid={cIdx === 0 ? 'chronic-option' : undefined}
                onClick={() => handleAddCondition(condition)}
                className="w-full px-4 py-2 text-left text-sm text-card-alt hover:bg-muted transition-colors"
              >
                {condition}
              </button>
            ))}
          </div>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md">
          {value.map((condition) => (
            <div
              key={condition}
              data-testid="chronic-tag"
              className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-full text-sm text-card-alt"
            >
              <span>{condition}</span>
              {!readOnly && (
                <button
                  type="button"
                  data-testid="chronic-remove-btn"
                  onClick={() => handleRemoveCondition(condition)}
                  className="text-muted-alt hover:text-card-alt transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/consultation/test-id',
  app: 'doctor',
  title: 'Chronic Conditions Field',
  elements: {
    label: { text: 'Chronic Conditions' },
    searchInput: { testId: 'chronic-search' },
    viewHistoryBtn: { testId: 'chronic-view-history' },
    closeHistoryBtn: { text: 'Close History' },
    dropdownOptions: { testId: 'chronic-option' },
    noResults: { testId: 'chronic-no-results' },
    selectedTags: { testId: 'chronic-tag' },
    removeTagBtn: { testId: 'chronic-remove-btn' },
  },
  flows: [
    {
      name: 'search and add a chronic condition',
      steps: [
        { on: 'searchInput', do: 'fill', value: 'diab' },
        { on: 'dropdownOptions', expect: 'countMin', value: 1 },
        { on: 'dropdownOptions', do: 'click' },
        { on: 'selectedTags', expect: 'countMin', value: 1 },
      ],
    },
    {
      name: 'toggle history panel',
      steps: [
        { on: 'viewHistoryBtn', do: 'click' },
        { on: 'closeHistoryBtn', expect: 'visible' },
        { on: 'closeHistoryBtn', do: 'click' },
        { on: 'viewHistoryBtn', expect: 'visible' },
      ],
    },
    {
      name: 'search with no results shows empty dropdown',
      steps: [
        { on: 'searchInput', do: 'fill', value: 'nonexistentconditionabc' },
        { on: 'noResults', expect: 'visible' },
        { on: 'dropdownOptions', expect: 'hidden' },
      ],
    },
  ],
});
