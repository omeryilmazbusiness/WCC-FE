import { cn } from "@/shared/lib/cn";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl bg-zinc-100 px-2.5 py-1 text-xs font-semibold capitalize text-zinc-700",
        className,
      )}
      {...props}
    />
  );
}
