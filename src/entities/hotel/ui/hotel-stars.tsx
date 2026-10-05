import { Star } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export function HotelStars({ stars, className, label }: { stars: number; className?: string; label?: string }) {
  if (stars <= 0) return null;
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={label ?? `${stars}★`}>
      {Array.from({ length: stars }, (_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={1.5} aria-hidden />
      ))}
    </span>
  );
}
