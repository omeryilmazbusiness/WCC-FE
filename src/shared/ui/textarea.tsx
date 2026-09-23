import * as React from "react";
import { cn } from "@/shared/lib/cn";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-[96px] w-full rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm transition-all duration-300 placeholder:text-zinc-400 focus-visible:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10 focus-visible:shadow-[0_10px_28px_-20px_rgba(24,24,27,0.35)] disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
