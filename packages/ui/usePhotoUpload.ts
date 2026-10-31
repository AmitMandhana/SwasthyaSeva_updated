"use client";

import { useState, useRef, useCallback } from "react";
import { uploadToCloudinary, type CloudinarySignatureResponse } from "./uploadToCloudinary";

export type CloudinarySignature = CloudinarySignatureResponse;

export interface UsePhotoUploadOptions {
  getSignature: () => Promise<CloudinarySignature>;
  onUploaded: (url: string) => Promise<void>;
}

export interface UsePhotoUploadReturn {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleAvatarClick: () => void;
  handleFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showPreview: boolean;
  previewUrl: string | null;
  uploadingPhoto: boolean;
  handleUpload: () => Promise<void>;
  cancelPreview: () => void;
}

export function usePhotoUpload({ getSignature, onUploaded }: UsePhotoUploadOptions): UsePhotoUploadReturn {
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowPreview(true);
    e.target.value = '';
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadToCloudinary(selectedFile, getSignature);
      await onUploaded(url);
      setShowPreview(false);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSelectedFile(null);
    } catch (err) {
      console.error('Photo upload failed:', err);
    } finally {
      setUploadingPhoto(false);
    }
  }, [selectedFile, getSignature, onUploaded, previewUrl]);

  const cancelPreview = useCallback(() => {
    setShowPreview(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
  }, [previewUrl]);

  return {
    fileInputRef,
    handleAvatarClick,
    handleFileSelected,
    showPreview,
    previewUrl,
    uploadingPhoto,
    handleUpload,
    cancelPreview,
  };
}
