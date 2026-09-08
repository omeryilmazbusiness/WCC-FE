import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

/** Empty / zero-state panel for lists and tabs */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[24px] border border-dashed border-zinc-200 bg-white/70 px-8 py-16 text-center shadow-[0_8px_30px_rgba(0,0,0,0.03)]",
        className,
      )}
    >
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
        <Icon className="h-6 w-6" strokeWidth={1.6} />
      </span>
      <h3 className="mt-5 text-base font-semibold text-zinc-950">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm font-medium text-zinc-500">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <Button type="button" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
