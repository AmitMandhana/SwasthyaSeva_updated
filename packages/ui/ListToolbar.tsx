"use client";

import { ReactNode } from "react";
import { RefreshCw, Plus } from "lucide-react";
import { Button } from "./Button";

export interface ListToolbarProps {
  onRefresh: () => void;
  loading?: boolean;
  refreshTestId?: string;
  actionLabel?: string;
  actionTestId?: string;
  onAction?: () => void;
  actionClassName?: string;
  trailing?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function ListToolbar({
  onRefresh,
  loading = false,
  refreshTestId,
  actionLabel,
  actionTestId,
  onAction,
  actionClassName = "",
  trailing,
  className = "",
  children,
}: ListToolbarProps) {
  return (
    <div className={`flex items-center gap-3 mb-4 ${className}`}>
      {children}
      <button
        data-testid={refreshTestId}
        onClick={onRefresh}
        className="text-muted-alt hover:text-card-alt"
        title="Refresh"
      >
        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
      </button>
      {trailing}
      {actionLabel && onAction && (
        <Button onClick={onAction} icon={<Plus size={16} />} data-testid={actionTestId} className={actionClassName}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
