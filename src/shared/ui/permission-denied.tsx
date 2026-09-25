import type { LucideIcon } from "lucide-react";
import { ShieldOff } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";

type PermissionDeniedProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

/** Permission-denied panel — distinct from ErrorState (Epic 17 T-216). */
export function PermissionDenied({
  title,
  description,
  icon: Icon = ShieldOff,
  actionLabel,
  onAction,
  className,
}: PermissionDeniedProps) {
  return (
    <div
      role="alert"
      data-testid="permission-denied"
      className={cn(
        "flex flex-col items-center justify-center rounded-[24px] border border-dashed border-amber-200 bg-amber-50/50 px-8 py-16 text-center",
        className,
      )}
    >
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        <Icon className="h-6 w-6" strokeWidth={1.6} />
      </span>
      <h3 className="mt-5 text-base font-semibold text-zinc-950">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm font-medium text-zinc-500">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <Button type="button" variant="outline" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
