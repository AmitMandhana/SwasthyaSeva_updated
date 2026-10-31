'use client';

import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { ClipboardList, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@swasthyaseva/ui';

interface Props {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

const DELIMITER = '|||';
const SUB_DELIMITER = ':::';
const DUR_MARKER = '~~';

type Complaint = { text: string; duration: string; associated: string[] };

function parse(raw: string): Complaint[] {
  if (!raw) return [];
  const items = raw.includes(DELIMITER) ? raw.split(DELIMITER).filter(Boolean) : raw.trim() ? [raw.trim()] : [];
  return items.map(item => {
    let duration = '';
    let rest = item;
    if (rest.includes(DUR_MARKER)) {
      const idx = rest.indexOf(DUR_MARKER);
      duration = rest.slice(idx + DUR_MARKER.length).split(SUB_DELIMITER)[0];
      rest = rest.slice(0, idx) + rest.slice(idx + DUR_MARKER.length + duration.length);
    }
    if (rest.includes(SUB_DELIMITER)) {
      const [text, ...associated] = rest.split(SUB_DELIMITER);
      return { text, duration, associated: associated.filter(Boolean) };
    }
    return { text: rest, duration, associated: [] };
  });
}

function serialize(complaints: Complaint[]): string {
  return complaints.map(c => {
    const durPart = c.duration ? `${DUR_MARKER}${c.duration}` : '';
    const parts = [c.text + durPart, ...c.associated];
    return parts.join(SUB_DELIMITER);
  }).join(DELIMITER);
}

import { componentTestSpec } from '@swasthyaseva/test-gen';

function parseDurationDays(dur: string): number {
  if (!dur) return 0;
  const num = parseFloat(dur) || 0;
  const lower = dur.toLowerCase();
  if (lower.includes('year') || lower.includes('yr')) return num * 365;
  if (lower.includes('month') || lower.includes('mon')) return num * 30;
  if (lower.includes('week') || lower.includes('wk')) return num * 7;
  return num;
}

function sortByDuration(complaints: Complaint[]): Complaint[] {
  return [...complaints].sort((a, b) => parseDurationDays(b.duration) - parseDurationDays(a.duration));
}

function complaintKey(c: Complaint): string {
  return `${c.text}__${c.associated.join(',')}`;
}

export default function ClinicalDiagnosticWorkup({ value, onChange, readOnly }: Props) {
  const [input, setInput] = useState('');
  const [durInput, setDurInput] = useState('');
  const [assocInput, setAssocInput] = useState('');
  const [subInput, setSubInput] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const complaints = parse(value);

  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const posCache = useRef<Map<string, DOMRect>>(new Map());

  const capturePositions = useCallback(() => {
    posCache.current.clear();
    itemRefs.current.forEach((el, key) => {
      posCache.current.set(key, el.getBoundingClientRect());
    });
  }, []);

  useLayoutEffect(() => {
    const prev = posCache.current;
    if (prev.size === 0) return;
    itemRefs.current.forEach((el, key) => {
      const oldRect = prev.get(key);
      if (!oldRect) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-12px)';
        requestAnimationFrame(() => {
          el.style.transition = 'transform 300ms ease, opacity 300ms ease';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          el.addEventListener('transitionend', () => { el.style.transition = ''; el.style.transform = ''; }, { once: true });
        });
        return;
      }
      const newRect = el.getBoundingClientRect();
      const dy = oldRect.top - newRect.top;
      if (Math.abs(dy) < 1) return;
      el.style.transform = `translateY(${dy}px)`;
      el.style.transition = '';
      requestAnimationFrame(() => {
        el.style.transition = 'transform 300ms ease';
        el.style.transform = 'translateY(0)';
        el.addEventListener('transitionend', () => { el.style.transition = ''; el.style.transform = ''; }, { once: true });
      });
    });
    posCache.current.clear();
  });

  function addComplaint() {
    const trimmed = input.trim();
    if (!trimmed) return;
    capturePositions();
    const associated = assocInput.trim() ? [assocInput.trim()] : [];
    const updated = sortByDuration([...complaints, { text: trimmed, duration: durInput.trim(), associated }]);
    onChange(serialize(updated));
    setInput('');
    setDurInput('');
    setAssocInput('');
  }

  function removeComplaint(index: number) {
    onChange(serialize(complaints.filter((_, i) => i !== index)));
    if (expandedIdx === index) setExpandedIdx(null);
  }

  function updateDuration(index: number, dur: string) {
    capturePositions();
    const updated = [...complaints];
    updated[index] = { ...updated[index], duration: dur };
    onChange(serialize(sortByDuration(updated)));
  }

  function addAssociated(index: number) {
    const trimmed = subInput.trim();
    if (!trimmed) return;
    const updated = [...complaints];
    updated[index] = { ...updated[index], associated: [...updated[index].associated, trimmed] };
    onChange(serialize(updated));
    setSubInput('');
  }

  function removeAssociated(complaintIdx: number, assocIdx: number) {
    const updated = [...complaints];
    updated[complaintIdx] = { ...updated[complaintIdx], associated: updated[complaintIdx].associated.filter((_, i) => i !== assocIdx) };
    onChange(serialize(updated));
  }

  return (
    <section className="bg-card p-6 rounded-lg border border-border mb-4">
      <h2 className="text-2xl font-bold text-card-alt flex items-center gap-2 mb-4">
        <ClipboardList className="w-6 h-6 text-primary" />
        Clinical Diagnostic Workup
      </h2>
      <label className="block text-sm font-medium text-card-alt mb-2">Chief Complaints</label>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          data-testid="chief-complaint-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addComplaint(); } }}
          placeholder="Type a complaint..."
          className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt text-sm"
        />
        <input
          type="text"
          data-testid="chief-complaint-duration"
          value={durInput}
          onChange={(e) => setDurInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addComplaint(); } }}
          placeholder="Duration"
          className="w-28 px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt text-sm"
        />
        <input
          type="text"
          data-testid="chief-complaint-associated"
          value={assocInput}
          onChange={(e) => setAssocInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addComplaint(); } }}
          placeholder="Associated Complaints"
          className="w-48 px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt text-sm"
        />
        <Button data-testid="chief-complaint-add-btn" onClick={addComplaint} disabled={!input.trim()} size="sm" icon={<Plus size={14} />}>
          Add
        </Button>
      </div>

      {complaints.length > 0 ? (
        <ol className="space-y-2">
          {complaints.map((complaint, i) => {
            const key = complaintKey(complaint);
            return (
            <li key={key} ref={el => { if (el) itemRefs.current.set(key, el); else itemRefs.current.delete(key); }} className="bg-muted/30 rounded-md overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 group">
                <button type="button" onClick={() => setExpandedIdx(expandedIdx === i ? null : i)} className="shrink-0 text-muted-alt hover:text-card-alt">
                  {expandedIdx === i ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <span className="text-xs text-muted-alt font-medium shrink-0">{i + 1}.</span>
                <span className="flex-1 text-sm text-card-alt">
                  {complaint.text}
                  {complaint.duration && <span className="text-muted-alt ml-1">· {complaint.duration}</span>}
                </span>
                <input
                  type="text"
                  value={complaint.duration}
                  onChange={(e) => updateDuration(i, e.target.value)}
                  placeholder="Duration"
                  className="w-24 px-2 py-1 text-xs border border-input rounded bg-background text-muted-alt focus:border-primary focus:outline-none"
                />
                {complaint.associated.length > 0 && (
                  <span className="text-xs text-muted-alt shrink-0">{complaint.associated.join(', ')}</span>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    data-testid="complaint-add-associated-btn"
                    onClick={(e) => { e.stopPropagation(); setExpandedIdx(i); }}
                    className="shrink-0 px-3 py-1 text-xs rounded bg-accent/60 text-accent-alt hover:bg-accent transition-colors"
                  >
                    + Add Associated Complaint
                  </button>
                )}
                {!readOnly && (
                  <button type="button" onClick={() => removeComplaint(i)} className="shrink-0 text-muted-alt hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={14} />
                  </button>
                )}
              </div>

              {expandedIdx === i && (
                <div className="px-8 pb-3 space-y-2">
                  {complaint.associated.map((assoc, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm text-muted-alt group/sub">
                      <span className="text-xs">↳</span>
                      <span className="flex-1">{assoc}</span>
                      <button type="button" onClick={() => removeAssociated(i, j)} className="shrink-0 text-muted-alt hover:text-destructive opacity-0 group-hover/sub:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={subInput}
                      onChange={(e) => setSubInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAssociated(i); } }}
                      placeholder="Add associated complaint..."
                      className="flex-1 px-2 py-1 text-xs border border-input rounded bg-background text-card-alt focus:border-primary focus:outline-none"
                    />
                    <Button variant="accent" size="xs" type="button" onClick={() => addAssociated(i)} disabled={!subInput.trim()}>Add</Button>
                  </div>
                </div>
              )}
            </li>
          );
          })}
        </ol>
      ) : (
        <p className="text-sm text-muted-alt py-2">No complaints added yet.</p>
      )}
    </section>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/consultation/test-id',
  app: 'doctor',
  title: 'Clinical Diagnostic Workup',
  elements: {
    sectionHeader: { text: 'Clinical Diagnostic Workup' },
    complaintInput: { testId: 'chief-complaint-input' },
    durationInput: { testId: 'chief-complaint-duration' },
    addBtn: { testId: 'chief-complaint-add-btn' },
    emptyMessage: { text: 'No complaints added yet.' },
  },
  flows: [
    {
      name: 'add complaint with duration',
      steps: [
        { on: 'emptyMessage', expect: 'visible' },
        { on: 'complaintInput', do: 'fill', value: 'Headache' },
        { on: 'durationInput', do: 'fill', value: '3 days' },
        { on: 'addBtn', do: 'click' },
        { on: 'emptyMessage', expect: 'hidden' },
      ],
    },
    {
      name: 'add complaint without duration',
      steps: [
        { on: 'complaintInput', do: 'fill', value: 'Nausea' },
        { on: 'addBtn', do: 'click' },
        { on: 'emptyMessage', expect: 'hidden' },
      ],
    },
    {
      name: 'add button disabled when input empty',
      steps: [
        { on: 'addBtn', expect: 'disabled' },
        { on: 'complaintInput', do: 'fill', value: 'Test' },
        { on: 'addBtn', expect: 'enabled' },
      ],
    },
  ],
});
