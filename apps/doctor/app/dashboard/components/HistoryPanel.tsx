'use client';

import React, { useState } from 'react';
import { X, ChevronRight, ChevronDown } from 'lucide-react';
import { componentTestSpec } from '@swasthyaseva/test-gen';

interface HistoryEntry {
  timestamp: string;
  items: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  history: HistoryEntry[];
  itemLabel: string; // e.g., "condition" or "allergy"
}

export default function HistoryPanel({ isOpen, onClose, title, history, itemLabel }: Props) {
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());

  const formatDate = (timestamp: string) => {
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const toggleExpand = (index: number) => {
    setExpandedIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className={`h-full w-full md:w-[320px] bg-card border-l border-border flex flex-col overflow-hidden transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* Header */}
      <div className="bg-card border-b border-border p-6 flex justify-between items-center shrink-0">
        <h2 data-testid="history-panel-title" className="text-xl font-bold text-card-alt">{title}</h2>
        <button
          data-testid="history-panel-close"
          onClick={onClose}
          className="text-muted-alt hover:text-card-alt transition-colors p-2 hover:bg-muted rounded-md"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto flex-1">
        {history.length === 0 ? (
          <p className="text-center text-muted-alt py-8">No history available</p>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => (
              <div key={index} className="relative">
                {/* Timeline line */}
                {index < history.length - 1 && (
                  <div className="absolute left-2.75 top-8 bottom-0 w-0.5 bg-border" />
                )}

                {/* Timeline dot */}
                <div className="absolute left-0 top-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>

                {/* Content */}
                <div className="ml-10">
                  <button
                    type="button"
                    data-testid="history-panel-entry"
                    onClick={() => toggleExpand(index)}
                    className="w-full flex items-start gap-2 text-left group"
                  >
                    {expandedIndices.has(index) ? (
                      <ChevronDown className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-alt group-hover:text-primary mt-0.5 shrink-0 transition-colors" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-semibold text-card-alt whitespace-nowrap">
                          {formatDate(entry.timestamp)}
                        </span>
                        <span className="text-xs text-muted-alt whitespace-nowrap">
                          {entry.items.length} {itemLabel}{entry.items.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {!expandedIndices.has(index) && (
                        <p className="text-sm text-muted-alt truncate overflow-hidden whitespace-nowrap">
                          {entry.items.join(', ')}
                        </p>
                      )}
                    </div>
                  </button>

                  {expandedIndices.has(index) && (
                    <div className="mt-3 ml-7 space-y-2">
                      {entry.items.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          data-testid="history-panel-expanded"
                          className="px-3 py-2 bg-muted border border-border rounded-md text-sm text-card-alt"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/consultation/test-id',
  app: 'doctor',
  title: 'History Panel',
  elements: {
    panelTitle: { testId: 'history-panel-title' },
    closeBtn: { testId: 'history-panel-close' },
    emptyMessage: { text: 'No history available' },
    timelineEntry: { testId: 'history-panel-entry' },
    expandedItems: { testId: 'history-panel-expanded' },
  },
  flows: [
    {
      name: 'expand and collapse a history entry',
      steps: [
        { on: 'timelineEntry', expect: 'countMin', value: 1 },
        { on: 'timelineEntry', do: 'click' },
        { on: 'expandedItems', expect: 'countMin', value: 1 },
        { on: 'timelineEntry', do: 'click' },
        { on: 'expandedItems', expect: 'hidden' },
      ],
    },
    {
      name: 'close the history panel',
      steps: [
        { on: 'closeBtn', do: 'click' },
        { on: 'panelTitle', expect: 'hidden' },
      ],
    },
  ],
});
