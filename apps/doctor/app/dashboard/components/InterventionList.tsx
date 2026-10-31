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

function parse(raw: string): string[] {
  if (!raw) return [];
  if (raw.includes(DELIMITER)) return raw.split(DELIMITER).filter(Boolean);
  return raw.trim() ? [raw.trim()] : [];
}

export default function InterventionList({ value, onChange, readOnly }: Props) {
  const [input, setInput] = useState('');
  const items = parse(value);

  function add() {
    const trimmed = input.trim();
    if (!trimmed) return;
    onChange([...items, trimmed].join(DELIMITER));
    setInput('');
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index).join(DELIMITER));
  }

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex gap-2">
          <input
            type="text"
            data-testid="intervention-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder="Add intervention..."
            className="flex-1 px-2 py-1.5 text-sm border border-input rounded-md focus:outline-none focus:border-primary bg-background text-card-alt"
          />
          <Button data-testid="intervention-add-btn" onClick={add} disabled={!input.trim()} size="sm" icon={<Plus size={14} />}>
            Add
          </Button>
        </div>
      )}
      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 bg-muted/30 rounded px-2 py-1.5 text-sm text-card-alt group">
              <span className="flex-1">{item}</span>
              {!readOnly && <button type="button" onClick={() => remove(i)} className="text-muted-alt hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/consultation/test-id',
  app: 'doctor',
  title: 'Intervention List',
  elements: {
    interventionInput: { testId: 'intervention-input' },
    addBtn: { testId: 'intervention-add-btn' },
  },
  flows: [
    {
      name: 'add intervention item',
      steps: [
        { on: 'interventionInput', do: 'fill', value: 'CBC' },
        { on: 'addBtn', do: 'click' },
        { on: 'interventionInput', do: 'fill', value: 'ESR' },
        { on: 'addBtn', do: 'click' },
      ],
    },
    {
      name: 'add button disabled when input empty',
      steps: [
        { on: 'addBtn', expect: 'disabled' },
        { on: 'interventionInput', do: 'fill', value: 'X-Ray' },
        { on: 'addBtn', expect: 'enabled' },
      ],
    },
  ],
});
