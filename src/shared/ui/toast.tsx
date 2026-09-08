"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export type ToastTone = "default" | "success" | "error" | "info";

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastContextValue = {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, "id"> & { id?: string }) => string;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback(
    (toast: Omit<ToastItem, "id"> & { id?: string }) => {
      const id = toast.id ?? crypto.randomUUID();
      const item: ToastItem = {
        id,
        title: toast.title,
        description: toast.description,
        tone: toast.tone ?? "default",
        durationMs: toast.durationMs ?? 4200,
      };
      setToasts((prev) => [...prev, item]);
      if (item.durationMs && item.durationMs > 0) {
        window.setTimeout(() => dismiss(id), item.durationMs);
      }
      return id;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const toneIcon = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

const toneStyles = {
  default: "border-zinc-200/80",
  success: "border-emerald-200/80",
  error: "border-rose-200/80",
  info: "border-sky-200/80",
} as const;

const toneIconStyles = {
  default: "bg-zinc-100 text-zinc-700",
  success: "bg-emerald-50 text-emerald-700",
  error: "bg-rose-50 text-rose-700",
  info: "bg-sky-50 text-sky-700",
} as const;

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-6 end-6 z-[100] flex w-full max-w-sm flex-col gap-3"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const tone = toast.tone ?? "default";
        const Icon = toneIcon[tone];
        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-[20px] border bg-white p-4 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.4)] transition-all duration-300",
              toneStyles[tone],
            )}
          >
            <span
              className={cn(
                "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
                toneIconStyles[tone],
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-950">{toast.title}</p>
              {toast.description ? (
                <p className="mt-1 text-sm font-medium text-zinc-500">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded-xl p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
