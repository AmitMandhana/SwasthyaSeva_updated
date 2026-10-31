'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@swasthyaseva/ui';
import { componentTestSpec } from '@swasthyaseva/test-gen';

interface Props {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

const DELIMITER = '|||';

function parseFindings(raw: string): string[] {
  if (!raw) return [];
  if (raw.includes(DELIMITER)) return raw.split(DELIMITER).filter(Boolean);
  return raw.trim() ? [raw.trim()] : [];
}

function serializeFindings(findings: string[]): string {
  return findings.join(DELIMITER);
}

export default function FindingsOnExamination({ value, onChange, readOnly }: Props) {
  const [input, setInput] = useState('');
  const findings = parseFindings(value);

  function addFinding() {
    const trimmed = input.trim();
    if (!trimmed) return;
    onChange(serializeFindings([...findings, trimmed]));
    setInput('');
  }

  function removeFinding(index: number) {
    const updated = findings.filter((_, i) => i !== index);
    onChange(serializeFindings(updated));
  }

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex gap-2">
          <input
            type="text"
            data-testid="finding-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFinding(); } }}
            placeholder="Type a finding and press Enter..."
            className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt text-sm"
          />
          <Button
            data-testid="finding-add-btn"
            onClick={addFinding}
            disabled={!input.trim()}
            size="sm"
            icon={<Plus size={14} />}
          >
            Add
          </Button>
        </div>
      )}

      {findings.length > 0 && (
        <ol className="space-y-1.5">
          {findings.map((finding, i) => (
            <li key={i} className="flex items-start gap-2 bg-muted/30 rounded-md px-3 py-2 group">
              <span className="text-xs text-muted-alt font-medium mt-0.5 shrink-0">{i + 1}.</span>
              <span className="flex-1 text-sm text-card-alt">{finding}</span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeFinding(i)}
                  className="shrink-0 text-muted-alt hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      {findings.length === 0 && (
        <p className="text-sm text-muted-alt py-2">No findings added yet.</p>
      )}
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/consultation/test-id',
  app: 'doctor',
  title: 'Findings On Examination',
  elements: {
    findingInput: { testId: 'finding-input' },
    addBtn: { testId: 'finding-add-btn' },
    emptyMessage: { text: 'No findings added yet.' },
  },
  flows: [
    {
      name: 'add finding and verify it appears',
      steps: [
        { on: 'emptyMessage', expect: 'visible' },
        { on: 'findingInput', do: 'fill', value: 'Mild tenderness in abdomen' },
        { on: 'addBtn', do: 'click' },
        { on: 'emptyMessage', expect: 'hidden' },
      ],
    },
    {
      name: 'add button disabled when input empty',
      steps: [
        { on: 'addBtn', expect: 'disabled' },
        { on: 'findingInput', do: 'fill', value: 'Test finding' },
        { on: 'addBtn', expect: 'enabled' },
      ],
    },
  ],
});
