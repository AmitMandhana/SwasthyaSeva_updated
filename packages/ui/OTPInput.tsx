"use client";

import { useRef, useCallback, KeyboardEvent, ClipboardEvent, ChangeEvent } from "react";

export interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  "data-testid"?: string;
}

export function OTPInput({
  value,
  onChange,
  length = 6,
  error,
  disabled = false,
  autoFocus = false,
  "data-testid": testId,
}: OTPInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.padEnd(length, " ").slice(0, length).split("");

  const focusAt = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, length - 1));
    inputsRef.current[clamped]?.focus();
  }, [length]);

  function handleChange(e: ChangeEvent<HTMLInputElement>, idx: number) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    const char = raw.slice(-1);
    const next = digits.slice();
    next[idx] = char;
    onChange(next.join(""));
    if (idx < length - 1) focusAt(idx + 1);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = digits.slice();
      if (next[idx]) {
        next[idx] = "";
        onChange(next.join("").replace(/ +$/, ""));
      } else if (idx > 0) {
        next[idx - 1] = "";
        onChange(next.join("").replace(/ +$/, ""));
        focusAt(idx - 1);
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      focusAt(idx - 1);
    } else if (e.key === "ArrowRight" && idx < length - 1) {
      e.preventDefault();
      focusAt(idx + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted) {
      onChange(pasted);
      focusAt(Math.min(pasted.length, length - 1));
    }
  }

  function handleBridgeChange(e: ChangeEvent<HTMLInputElement>) {
    const cleaned = e.target.value.replace(/\D/g, "").slice(0, length);
    onChange(cleaned);
    if (cleaned.length > 0) focusAt(Math.min(cleaned.length, length - 1));
  }

  return (
    <div>
      <input
        data-testid={testId}
        value={value}
        onChange={handleBridgeChange}
        className="absolute w-px h-px opacity-0 overflow-hidden"
        tabIndex={-1}
        aria-hidden="true"
      />
      <div className="flex gap-2 justify-center">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d === " " ? "" : d}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            autoFocus={autoFocus && i === 0}
            disabled={disabled}
            aria-label={`Digit ${i + 1}`}
            className={`w-11 h-[52px] text-center text-xl font-semibold rounded-lg border-2 outline-none transition-colors bg-background text-card-alt
              ${error ? "border-destructive" : "border-border/80 focus:border-primary focus:ring-1 focus:ring-primary/30"}
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          />
        ))}
      </div>
      {error && (
        <p role="alert" data-testid={testId ? `${testId}-error` : undefined} className="text-destructive text-xs text-center mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
