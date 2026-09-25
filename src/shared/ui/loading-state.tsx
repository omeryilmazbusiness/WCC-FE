import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type LoadingStateProps = {
  label?: string;
  className?: string;
};

/** Soft loading panel — pairs with EmptyState / ErrorState (Epic 17 T-216). */
export function LoadingState({
  label = "Loading…",
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="loading-state"
      className={cn(
        "flex flex-col items-center justify-center rounded-[24px] border border-dashed border-zinc-200 bg-white/70 px-8 py-16 text-center",
        className,
      )}
    >
      <Loader2
        className="h-8 w-8 animate-spin text-zinc-400"
        strokeWidth={1.6}
        aria-hidden
      />
      <p className="mt-4 text-sm font-medium text-zinc-500">{label}</p>
    </div>
  );
}
