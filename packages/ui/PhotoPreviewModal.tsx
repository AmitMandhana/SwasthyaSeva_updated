"use client";

import { Loader2, Check } from "lucide-react";
import { Modal } from "./Modal";
import type { UsePhotoUploadReturn } from "./usePhotoUpload";

export interface PhotoPreviewModalProps {
  photo: UsePhotoUploadReturn;
}

export function PhotoPreviewModal({ photo }: PhotoPreviewModalProps) {
  if (!photo.showPreview || !photo.previewUrl) return null;

  return (
    <Modal title="Change Profile Photo" onClose={photo.cancelPreview} maxWidth="sm" footer={
      <div className="flex justify-end gap-3">
        <button onClick={photo.cancelPreview} className="px-4 py-2 rounded-md text-sm font-medium text-muted-alt hover:bg-muted transition-colors">
          Cancel
        </button>
        <button
          onClick={photo.handleUpload}
          disabled={photo.uploadingPhoto}
          className="flex items-center gap-2 bg-primary hover:opacity-90 text-primary-alt px-5 py-2 rounded-md transition-colors font-medium text-sm disabled:opacity-50"
        >
          {photo.uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {photo.uploadingPhoto ? 'Uploading...' : 'Save Photo'}
        </button>
      </div>
    }>
      <div className="flex justify-center">
        <img src={photo.previewUrl} alt="Preview" className="w-48 h-48 rounded-full object-cover ring-4 ring-primary/20" />
      </div>
    </Modal>
  );
}
