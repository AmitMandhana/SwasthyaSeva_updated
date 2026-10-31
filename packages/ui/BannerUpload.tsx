"use client";

import { Upload } from "lucide-react";

export interface BannerUploadProps {
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  error?: string;
  required?: boolean;
}

export function BannerUpload({ value, onChange, onUpload, error, required }: BannerUploadProps) {
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      try { const url = await onUpload(file); onChange(url); } catch {}
    }
  }

  return (
    <div className="relative mb-6 -mx-6 -mt-5">
      {required && (
        <div className="absolute top-2 left-2 z-10 text-xs font-medium text-white bg-black/60 px-2 py-1 rounded">
          Banner
          {error
            ? <span className="text-destructive ml-1">is required</span>
            : <span className="text-destructive ml-0.5">*</span>}
        </div>
      )}
      {value ? (
        <div className="relative group">
          <img src={value} alt="Banner" className="w-full h-36 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium bg-white/90 text-gray-800 hover:bg-white">
              Change
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
            <button type="button" onClick={() => onChange("")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/90 text-destructive hover:bg-white">
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label className="flex items-center justify-center w-full h-36 bg-muted border-b border-border cursor-pointer hover:bg-muted/80 transition-colors">
          <div className="flex flex-col items-center gap-1 text-muted-alt">
            <Upload size={20} />
            <span className="text-xs">
              Upload Banner
              {required && (error
                ? <span className="text-destructive ml-1">is required</span>
                : <span className="text-destructive ml-0.5">*</span>)}
            </span>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      )}
    </div>
  );
}
