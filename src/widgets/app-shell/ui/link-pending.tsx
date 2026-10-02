"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/shared/lib/cn";

/**
 * Spinner for the enclosing Link while its navigation is pending. Fades in after a
 * short delay so fast (prefetched) navigations never flash it. Render inside a Link.
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return <PendingSpinner pending={pending} className={className} />;
}

export function PendingSpinner({ pending, className }: { pending: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      data-pending={pending || undefined}
      className={cn(
        "pointer-events-none block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent opacity-0 transition-opacity duration-150",
        pending && "animate-spin opacity-60 delay-150 motion-reduce:animate-none",
        className,
      )}
    />
  );
}
