'use client';

import React, { useState } from 'react';
import { X, ChevronRight, ChevronDown } from 'lucide-react';
import { AllergicConditionHistory } from '../types';
import { componentTestSpec } from '@swasthyaseva/test-gen';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  history: AllergicConditionHistory[];
}

export default function AllergicConditionsTimeline({ isOpen, onClose, history }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const formatDate = (timestamp: string) => {
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div data-testid="allergy-timeline-backdrop" className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="bg-card border-b border-border p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-card-alt">Allergy History</h2>
          <button
            data-testid="allergy-timeline-close"
            onClick={onClose}
            className="text-muted-alt hover:text-card-alt transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-88px)]">
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
                      data-testid="allergy-timeline-entry"
                      onClick={() => toggleExpand(index)}
                      className="w-full flex items-start gap-2 text-left group"
                    >
                      {expandedIndex === index ? (
                        <ChevronDown className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-alt group-hover:text-primary mt-0.5 shrink-0 transition-colors" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-semibold text-card-alt">
                            {formatDate(entry.timestamp)}
                          </span>
                          <span className="text-xs text-muted-alt">
                            {entry.allergic_conditions.length} allerg{entry.allergic_conditions.length !== 1 ? 'ies' : 'y'}
                          </span>
                        </div>
                        {expandedIndex !== index && (
                          <p className="text-sm text-muted-alt truncate">
                            {entry.allergic_conditions.join(', ')}
                          </p>
                        )}
                      </div>
                    </button>

                    {expandedIndex === index && (
                      <div className="mt-3 ml-7 space-y-2">
                        {entry.allergic_conditions.map((condition, condIndex) => (
                          <div
                            key={condIndex}
                            data-testid="allergy-timeline-expanded"
                            className="px-3 py-2 bg-muted border border-border rounded-md text-sm text-card-alt"
                          >
                            {condition}
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
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/consultation/test-id',
  app: 'doctor',
  title: 'Allergic Conditions Timeline Modal',
  elements: {
    modalBackdrop: { testId: 'allergy-timeline-backdrop' },
    modalTitle: { text: 'Allergy History' },
    closeBtn: { testId: 'allergy-timeline-close' },
    emptyMessage: { text: 'No history available' },
    timelineEntry: { testId: 'allergy-timeline-entry' },
    expandedConditions: { testId: 'allergy-timeline-expanded' },
  },
  flows: [
    {
      name: 'view and expand allergy history entries',
      steps: [
        { on: 'modalTitle', expect: 'visible' },
        { on: 'timelineEntry', expect: 'countMin', value: 1 },
        { on: 'timelineEntry', do: 'click' },
        { on: 'expandedConditions', expect: 'countMin', value: 1 },
        { on: 'timelineEntry', do: 'click' },
        { on: 'expandedConditions', expect: 'hidden' },
      ],
    },
    {
      name: 'close allergy timeline modal',
      steps: [
        { on: 'closeBtn', do: 'click' },
        { on: 'modalTitle', expect: 'hidden' },
      ],
    },
  ],
});
