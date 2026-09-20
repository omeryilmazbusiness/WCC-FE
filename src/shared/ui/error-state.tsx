import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";

type ErrorStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
};

/** Error / failed-load panel for lists and screens */
export function ErrorState({
  title,
  description,
  icon: Icon = AlertTriangle,
  retryLabel,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-[24px] border border-dashed border-rose-200 bg-rose-50/40 px-8 py-16 text-center shadow-[0_8px_30px_rgba(0,0,0,0.03)]",
        className,
      )}
    >
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
        <Icon className="h-6 w-6" strokeWidth={1.6} />
      </span>
      <h3 className="mt-5 text-base font-semibold text-zinc-950">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm font-medium text-zinc-500">
          {description}
        </p>
      ) : null}
      {retryLabel && onRetry ? (
        <Button type="button" variant="outline" className="mt-6" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
