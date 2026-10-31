"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export interface CopyablePasswordProps {
  password: string;
  "data-testid"?: string;
}

export function CopyablePassword({ password, "data-testid": testId = "temp-password" }: CopyablePasswordProps) {
  const [copied, setCopied] = useState(false);
  return (
    <div data-testid={testId} className="flex items-center gap-2 rounded-lg px-4 py-3 font-mono text-sm bg-muted text-success">
      <span className="flex-1">{password}</span>
      <button
        type="button"
        onClick={() => { navigator.clipboard.writeText(password); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="shrink-0 p-1 rounded hover:bg-background transition-colors"
        title="Copy to clipboard"
      >
        {copied ? <Check size={16} className="text-success" /> : <Copy size={16} className="text-muted-alt" />}
      </button>
    </div>
  );
}
