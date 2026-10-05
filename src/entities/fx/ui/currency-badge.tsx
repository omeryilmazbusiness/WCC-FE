import { cn } from "@/shared/lib/cn";
import { currencySymbol } from "@/shared/lib/money";
import { TONES, type Tone } from "@/shared/ui";

const FIXED_TONES: Record<string, Tone> = {
  USD: "emerald",
  EUR: "indigo",
  GBP: "violet",
  SAR: "teal",
  SYP: "sky",
  TRY: "rose",
  AED: "amber",
};
const ROTATION: Tone[] = ["sky", "indigo", "emerald", "amber", "rose", "violet", "teal"];

/** Stable colour per currency so a pair reads the same everywhere. */
export function currencyTone(code: string): Tone {
  const fixed = FIXED_TONES[code];
  if (fixed) return fixed;
  let hash = 0;
  for (const ch of code) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return ROTATION[hash % ROTATION.length];
}

const SIZE = {
  sm: "h-8 w-8 text-[12px]",
  md: "h-10 w-10 text-[14px]",
  lg: "h-12 w-12 text-[17px]",
} as const;

type BadgeProps = { code: string; size?: keyof typeof SIZE; className?: string };

export function CurrencyBadge({ code, size = "md", className }: BadgeProps) {
  const symbol = currencySymbol(code);
  return (
    <span
      aria-hidden
      dir="ltr"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold ring-[2.5px] ring-white",
        TONES[currencyTone(code)].gradient,
        SIZE[size],
        symbol.length > 1 && "text-[10.5px] tracking-tight",
        className,
      )}
    >
      {symbol}
    </span>
  );
}

/** Base over quote, overlapping like stacked coins. */
export function CurrencyPairBadge({ base, quote, size = "md", className }: { base: string; quote: string; size?: BadgeProps["size"]; className?: string }) {
  return (
    <span className={cn("flex shrink-0 items-center", className)} aria-hidden>
      <CurrencyBadge code={base} size={size} />
      <CurrencyBadge code={quote} size={size} className="-ms-3" />
    </span>
  );
}
