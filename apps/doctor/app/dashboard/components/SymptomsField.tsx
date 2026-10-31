'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { symptoms } from '../constants/symptoms';
import { componentTestSpec } from '@swasthyaseva/test-gen';

interface Props {
  value: string[];
  onChange: (symptoms: string[]) => void;
  label?: string;
}

export default function SymptomsField({ value, onChange, label = "Symptoms" }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filteredSymptoms, setFilteredSymptoms] = useState<string[]>([]);
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
        const filtered = symptoms.filter(
          (symptom) =>
            symptom.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !value.includes(symptom)
        );
        setFilteredSymptoms(filtered);
      } else {
        setFilteredSymptoms([]);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, value]);

  const handleAddSymptom = (symptom: string) => {
    if (!value.includes(symptom)) {
      onChange([...value, symptom]);
    }
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const handleRemoveSymptom = (symptom: string) => {
    onChange(value.filter((s) => s !== symptom));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-card-alt">{label}</label>

      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-alt" />
          <input
            type="text"
            data-testid="symptoms-search"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Search symptoms..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md text-card-alt placeholder-muted-alt focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary outline-none transition-colors"
          />
        </div>

        {isDropdownOpen && searchTerm.trim() && filteredSymptoms.length === 0 && (
          <div data-testid="symptoms-no-results" className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg px-4 py-3 text-sm text-muted-alt">
            No symptoms found
          </div>
        )}

        {isDropdownOpen && filteredSymptoms.length > 0 && (
          <div data-testid="symptoms-dropdown" className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filteredSymptoms.map((symptom) => (
              <button
                key={symptom}
                type="button"
                data-testid="symptoms-option"
                onClick={() => handleAddSymptom(symptom)}
                className="w-full px-4 py-2 text-left text-sm text-card-alt hover:bg-muted transition-colors"
              >
                {symptom}
              </button>
            ))}
          </div>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md">
          {value.map((symptom) => (
            <div
              key={symptom}
              data-testid="symptom-tag"
              className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-full text-sm text-card-alt"
            >
              <span>{symptom}</span>
              <button
                type="button"
                data-testid="symptom-remove-btn"
                onClick={() => handleRemoveSymptom(symptom)}
                className="text-muted-alt hover:text-card-alt transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
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
  title: 'Symptoms Field',
  elements: {
    searchInput: { testId: 'symptoms-search' },
    dropdownOptions: { testId: 'symptoms-option' },
    noResults: { testId: 'symptoms-no-results' },
    selectedTags: { testId: 'symptom-tag' },
    removeTagBtn: { testId: 'symptom-remove-btn' },
  },
  flows: [
    {
      name: 'search and select a symptom',
      steps: [
        { on: 'searchInput', do: 'fill', value: 'head' },
        { on: 'dropdownOptions', expect: 'countMin', value: 1 },
        { on: 'dropdownOptions', do: 'click' },
        { on: 'selectedTags', expect: 'countMin', value: 1 },
      ],
    },
    {
      name: 'remove a selected symptom',
      after: 'search and select a symptom',
      steps: [
        { on: 'removeTagBtn', do: 'click' },
        { on: 'selectedTags', expect: 'hidden' },
      ],
    },
    {
      name: 'search with no results shows empty dropdown',
      steps: [
        { on: 'searchInput', do: 'fill', value: 'nonexistentsymptomxyz' },
        { on: 'noResults', expect: 'visible' },
        { on: 'dropdownOptions', expect: 'hidden' },
      ],
    },
  ],
});
