"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";

export interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label: string;
  required?: boolean;
  error?: string;
  onUpload?: (file: File) => Promise<string>;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  label,
  required = false,
  error: externalError,
  onUpload,
  className = "",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setError("");
    setUploading(true);

    try {
      if (onUpload) {
        const url = await onUpload(file);
        setPreview(url);
        onChange(url);
      } else {
        // Default: create local preview URL
        const url = URL.createObjectURL(file);
        setPreview(url);
        onChange(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleClear() {
    setPreview("");
    onChange("");
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className={className}>
      <label className="flex items-center justify-between text-xs font-medium mb-1 text-muted-alt">
        <span>
          {label}
          {required && !externalError && <span aria-hidden="true" className="text-destructive ml-1">*</span>}
        </span>
        {externalError && (
          <span role="alert" className="text-destructive text-xs font-normal truncate max-w-[200px]" title={externalError}>
            {externalError}
          </span>
        )}
      </label>

      {preview ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img src={preview} alt="Preview" className="w-full h-32 object-cover bg-muted" />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 p-1 rounded-full bg-foreground/60 text-background hover:bg-foreground/80"
            title="Remove image"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id={`file-${label.replace(/\s+/g, "-")}`}
          />
          <label
            htmlFor={`file-${label.replace(/\s+/g, "-")}`}
            className="flex flex-col items-center justify-center w-full h-32 rounded-lg cursor-pointer border-2 border-dashed border-border bg-muted hover:bg-muted/80"
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-accent" />
                <span className="text-xs text-muted-alt">Uploading...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={24} className="text-muted-alt" />
                <span className="text-xs text-muted-alt">Click to upload image</span>
                <span className="text-xs text-muted-alt opacity-60">Max 5MB</span>
              </div>
            )}
          </label>
        </div>
      )}

      {error && (
        <p className="text-xs mt-1 rounded px-2 py-1 bg-destructive/10 text-destructive">{error}</p>
      )}

      {value && !preview && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-alt">
          <ImageIcon size={14} />
          <span className="truncate">{value}</span>
        </div>
      )}
    </div>
  );
}
