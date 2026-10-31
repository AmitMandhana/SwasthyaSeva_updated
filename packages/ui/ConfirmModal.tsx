"use client";

import { ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export type ConfirmVariant = "danger" | "warning" | "info";

export interface ConfirmModalProps {
  title: string;
  message: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const variantButton: Record<ConfirmVariant, string> = {
  danger: "bg-destructive text-destructive-alt hover:opacity-90",
  warning: "bg-warning text-warning-alt hover:opacity-90",
  info: "bg-primary text-primary-alt hover:opacity-90",
};

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      maxWidth="md"
      footer={
        <div className="flex gap-3">
          <button
            data-testid="confirm-action-btn"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${variantButton[variant]}`}
          >
            {loading ? "Processing…" : confirmLabel}
          </button>
          <Button data-testid="confirm-cancel-btn" onClick={onCancel} variant="secondary" className="flex-1">
            {cancelLabel}
          </Button>
        </div>
      }
    >
      <div className="text-sm text-card-alt">{message}</div>
    </Modal>
  );
}
