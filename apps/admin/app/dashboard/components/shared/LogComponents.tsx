"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function PillGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${value === o ? "bg-primary text-primary-alt" : "bg-card text-muted-alt hover:text-card-alt"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="shrink-0 p-0.5 text-muted-alt hover:text-card-alt transition-colors"
      title="Copy"
    >
      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
    </button>
  );
}

export function Detail({ label, value, mono, copyable, always }: { label: string; value: unknown; mono?: boolean; copyable?: boolean; always?: boolean }) {
  if (!always && (value == null || value === '')) return null;
  const str = value != null && value !== '' ? String(value) : '—';
  const isEmpty = str === '—';
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-alt shrink-0 w-20">{label}</span>
      <span className={`break-all flex-1 ${isEmpty ? "text-muted-alt" : "text-card-alt"} ${mono ? "font-mono" : ""}`}>{str}</span>
      {copyable && !isEmpty && <CopyBtn value={str} />}
    </div>
  );
}
