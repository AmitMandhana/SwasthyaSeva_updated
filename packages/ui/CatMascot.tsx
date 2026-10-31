"use client";

import { useEffect, useRef, useState } from "react";

export interface CatMascotProps {
  size?: number;
  className?: string;
  variant?: "sitting" | "peeking";
}

export function CatMascot({
  size = 120,
  className = "",
  variant = "sitting",
}: CatMascotProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pupil, setPupil] = useState({ lx: 0, ly: 0, rx: 0, ry: 0 });

  const leftEye = { x: 62, y: 72 };
  const rightEye = { x: 98, y: 72 };
  const maxOffset = 3;

  useEffect(() => {
    function handleMouse(e: MouseEvent) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const vbW = variant === "peeking" ? 160 : 160;
      const vbH = variant === "peeking" ? 90 : 180;
      const scaleX = vbW / rect.width;
      const scaleY = vbH / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      function calc(eyeX: number, eyeY: number) {
        const dx = mx - eyeX;
        const dy = my - eyeY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const clamp = Math.min(maxOffset, dist * 0.02);
        return { x: (dx / dist) * clamp, y: (dy / dist) * clamp };
      }
      const l = calc(leftEye.x, leftEye.y);
      const r = calc(rightEye.x, rightEye.y);
      setPupil({ lx: l.x, ly: l.y, rx: r.x, ry: r.y });
    }
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [variant]);

  const viewBox = variant === "peeking" ? "0 50 160 90" : "0 0 160 180";

  return (
    <svg
      ref={svgRef}
      width={size}
      height={variant === "peeking" ? size * 0.56 : size}
      viewBox={viewBox}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cat-fur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5ede4" />
          <stop offset="100%" stopColor="#e8ddd0" />
        </linearGradient>
        <linearGradient id="cat-fur-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4c4b0" />
          <stop offset="100%" stopColor="#c2b09a" />
        </linearGradient>
      </defs>

      {variant === "sitting" && (
        <>
          {/* Tail — fluffy, curving */}
          <path
            d="M118 148c12-4 22-12 26-24 3-10 0-18-6-16-5 2-6 10-4 18-3 10-10 18-16 22Z"
            fill="url(#cat-fur-dark)"
            stroke="#b8a590"
            strokeWidth="1"
          />
          {/* Body — round, warm */}
          <ellipse cx="80" cy="146" rx="36" ry="26" fill="url(#cat-fur)" stroke="#c2b09a" strokeWidth="1.2" />
          {/* Stethoscope cord draped on body */}
          <path
            d="M68 110c-4 12-8 26-4 36 2 6 8 8 14 6"
            stroke="#5b9bd5"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {/* Stethoscope chest piece on body */}
          <circle cx="78" cy="150" r="5" fill="#5b9bd5" opacity="0.8" />
          <circle cx="78" cy="150" r="2.5" fill="#4a8bc2" />
          {/* Front paws */}
          <ellipse cx="60" cy="166" rx="12" ry="7" fill="url(#cat-fur)" stroke="#c2b09a" strokeWidth="1" />
          <ellipse cx="100" cy="166" rx="12" ry="7" fill="url(#cat-fur)" stroke="#c2b09a" strokeWidth="1" />
          {/* Paw toe lines */}
          <path d="M54 164c0 3 2 5 4 5" stroke="#c2b09a" strokeWidth="0.8" fill="none" />
          <path d="M58 164c0 3 1.5 5 3 5" stroke="#c2b09a" strokeWidth="0.8" fill="none" />
          <path d="M94 164c0 3 1.5 5 3 5" stroke="#c2b09a" strokeWidth="0.8" fill="none" />
          <path d="M98 164c0 3 2 5 4 5" stroke="#c2b09a" strokeWidth="0.8" fill="none" />
        </>
      )}

      {variant === "peeking" && (
        <>
          {/* Paws resting on edge */}
          <ellipse cx="55" cy="130" rx="14" ry="6" fill="url(#cat-fur)" stroke="#c2b09a" strokeWidth="1" />
          <ellipse cx="105" cy="130" rx="14" ry="6" fill="url(#cat-fur)" stroke="#c2b09a" strokeWidth="1" />
          {/* Paw beans (pink) */}
          <circle cx="50" cy="129" r="2" fill="#e8a0a0" opacity="0.6" />
          <circle cx="55" cy="128" r="2" fill="#e8a0a0" opacity="0.6" />
          <circle cx="60" cy="129" r="2" fill="#e8a0a0" opacity="0.6" />
          <circle cx="100" cy="129" r="2" fill="#e8a0a0" opacity="0.6" />
          <circle cx="105" cy="128" r="2" fill="#e8a0a0" opacity="0.6" />
          <circle cx="110" cy="129" r="2" fill="#e8a0a0" opacity="0.6" />
        </>
      )}

      {/* ── Head ── */}
      <ellipse cx="80" cy="78" rx="38" ry="34" fill="url(#cat-fur)" stroke="#c2b09a" strokeWidth="1.2" />

      {/* Ears — organic triangles with inner pink */}
      <path d="M48 54c-4-18-2-32 8-40 4 14 2 28-8 40Z" fill="url(#cat-fur)" stroke="#c2b09a" strokeWidth="1" />
      <path d="M50 56c-3-14-1-26 6-32 3 11 1 22-6 32Z" fill="#e8a0a0" opacity="0.4" />
      <path d="M112 54c4-18 2-32-8-40-4 14-2 28 8 40Z" fill="url(#cat-fur)" stroke="#c2b09a" strokeWidth="1" />
      <path d="M110 56c3-14 1-26-6-32-3 11-1 22 6 32Z" fill="#e8a0a0" opacity="0.4" />

      {/* Forehead tabby stripes (subtle) */}
      <path d="M72 58c4-6 12-6 16 0" stroke="#d4c4b0" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M68 54c6-8 18-8 24 0" stroke="#d4c4b0" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5" />

      {/* Eyes — large, expressive */}
      <ellipse cx={leftEye.x} cy={leftEye.y} rx="11" ry="12" fill="#fff" stroke="#8b7b6b" strokeWidth="1.2" />
      <ellipse cx={rightEye.x} cy={rightEye.y} rx="11" ry="12" fill="#fff" stroke="#8b7b6b" strokeWidth="1.2" />

      {/* Irises — green/amber for warmth */}
      <circle cx={leftEye.x + pupil.lx} cy={leftEye.y + pupil.ly} r="6.5" fill="#6b9e6b" />
      <circle cx={rightEye.x + pupil.rx} cy={rightEye.y + pupil.ry} r="6.5" fill="#6b9e6b" />

      {/* Pupils */}
      <ellipse cx={leftEye.x + pupil.lx} cy={leftEye.y + pupil.ly} rx="3" ry="4" fill="#1a1a1a" />
      <ellipse cx={rightEye.x + pupil.rx} cy={rightEye.y + pupil.ry} rx="3" ry="4" fill="#1a1a1a" />

      {/* Eye highlights */}
      <circle cx={leftEye.x + pupil.lx - 2} cy={leftEye.y + pupil.ly - 3} r="2" fill="#fff" opacity="0.9" />
      <circle cx={rightEye.x + pupil.rx - 2} cy={rightEye.y + pupil.ry - 3} r="2" fill="#fff" opacity="0.9" />
      <circle cx={leftEye.x + pupil.lx + 1.5} cy={leftEye.y + pupil.ly + 1} r="1" fill="#fff" opacity="0.5" />
      <circle cx={rightEye.x + pupil.rx + 1.5} cy={rightEye.y + pupil.ry + 1} r="1" fill="#fff" opacity="0.5" />

      {/* Nose — small triangle, pink */}
      <path d="M77 84l3 4 3-4Z" fill="#e08080" stroke="#c06060" strokeWidth="0.5" />

      {/* Mouth — gentle smile */}
      <path d="M80 88c-4 3-8 3-10 1" stroke="#b8a590" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M80 88c4 3 8 3 10 1" stroke="#b8a590" strokeWidth="1" fill="none" strokeLinecap="round" />

      {/* Whiskers — organic curves */}
      <path d="M58 82c-16-2-28-6-32-4" stroke="#c2b09a" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <path d="M56 86c-18 0-30 2-34 6" stroke="#c2b09a" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <path d="M57 90c-14 4-24 8-28 14" stroke="#c2b09a" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <path d="M102 82c16-2 28-6 32-4" stroke="#c2b09a" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <path d="M104 86c18 0 30 2 34 6" stroke="#c2b09a" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <path d="M103 90c14 4 24 8 28 14" stroke="#c2b09a" strokeWidth="0.8" fill="none" strokeLinecap="round" />

      {/* Cheek blush */}
      <circle cx="50" cy="84" r="6" fill="#e8a0a0" opacity="0.2" />
      <circle cx="110" cy="84" r="6" fill="#e8a0a0" opacity="0.2" />

      {/* ── Doctor accessories ── */}
      {/* Stethoscope around neck */}
      <path
        d="M56 100c-2 4-4 8-4 12"
        stroke="#5b9bd5"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M104 100c2 4 4 8 4 12"
        stroke="#5b9bd5"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Stethoscope earpieces at top of neck */}
      <circle cx="56" cy="100" r="2" fill="#4a8bc2" />
      <circle cx="104" cy="100" r="2" fill="#4a8bc2" />

      {/* Head mirror / reflector on forehead */}
      <circle cx="80" cy="56" r="6" fill="#d4e8f0" stroke="#a0c4d4" strokeWidth="1" opacity="0.8" />
      <circle cx="80" cy="56" r="3" fill="#fff" opacity="0.6" />
      {/* Mirror band */}
      <path d="M74 56c0-4 3-6 6-6s6 2 6 6" stroke="#a0c4d4" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
