"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  addToast: (message: string, variant?: ToastVariant, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

const variantStyles: Record<ToastVariant, { bg: string; border: string; text: string; icon: ReactNode }> = {
  success: {
    bg: "bg-success/10",
    border: "border-success/30",
    text: "text-success",
    icon: <CheckCircle size={18} />,
  },
  error: {
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    text: "text-destructive",
    icon: <AlertCircle size={18} />,
  },
  warning: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    text: "text-warning",
    icon: <AlertTriangle size={18} />,
  },
  info: {
    bg: "bg-primary/10",
    border: "border-primary/30",
    text: "text-primary",
    icon: <Info size={18} />,
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const style = variantStyles[toast.variant];

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), toast.duration - 300);
    const removeTimer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, [toast, onDismiss]);

  return (
    <div
      data-testid={`toast-${toast.variant}`}
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg ${style.bg} ${style.border} transition-all duration-300 ${exiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}`}
      style={{ minWidth: 280, maxWidth: 420 }}
    >
      <span className={`shrink-0 mt-0.5 ${style.text}`}>{style.icon}</span>
      <p className={`text-sm font-medium flex-1 ${style.text}`}>{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className={`shrink-0 mt-0.5 ${style.text} opacity-60 hover:opacity-100 transition-opacity`}
      >
        <X size={16} />
      </button>
    </div>
  );
}

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = "info", duration = 4000) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, variant, duration }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 flex flex-col gap-2" style={{ zIndex: 99999 }}>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
