"use client";

import { Upload } from "lucide-react";

export interface AvatarUploadProps {
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  label?: string;
  error?: string;
  required?: boolean;
  showLabel?: boolean;
  emptyBorderColor?: string;
}

export function AvatarUpload({
  value, onChange, onUpload,
  label = "Photo", error, required, showLabel,
  emptyBorderColor = "border-destructive",
}: AvatarUploadProps) {
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      try { const url = await onUpload(file); onChange(url); } catch {}
    }
  }

  return (
    <div className="shrink-0 flex flex-col items-center justify-center">
      {value ? (
        <div className="relative group w-20 h-20">
          <img src={value} alt={label} className="w-20 h-20 rounded-full object-cover border-2 border-border" />
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <label className="cursor-pointer p-1.5 rounded-full bg-white/90 text-gray-800 hover:bg-white">
              <Upload size={14} />
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          </div>
        </div>
      ) : (
        <label className={`flex items-center justify-center w-20 h-20 rounded-full border-2 border-dashed ${emptyBorderColor} bg-muted cursor-pointer hover:bg-muted/80 transition-colors`}>
          <Upload size={16} className="text-muted-alt" />
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      )}
      {(required || showLabel) && (
        <p className="text-xs mt-1 text-center">
          <span className="text-card-alt">{label}</span>
          {required && (error
            ? <span className="text-destructive ml-1">is required</span>
            : <span className="text-destructive ml-0.5">*</span>)}
        </p>
      )}
    </div>
  );
}
