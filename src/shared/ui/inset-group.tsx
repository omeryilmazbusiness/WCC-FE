import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import type { Tone } from "./tone";

const GLYPH_BG: Record<Tone, string> = {
  sky: "from-sky-400 to-blue-600",
  indigo: "from-indigo-400 to-indigo-600",
  emerald: "from-emerald-400 to-emerald-600",
  amber: "from-amber-400 to-orange-500",
  rose: "from-rose-400 to-rose-600",
  violet: "from-violet-400 to-purple-600",
  teal: "from-teal-400 to-cyan-600",
  zinc: "from-zinc-400 to-zinc-600",
};

const GLYPH_SIZE = {
  sm: { box: "h-[30px] w-[30px] rounded-[8px]", icon: "h-[17px] w-[17px]" },
  md: { box: "h-10 w-10 rounded-[11px]", icon: "h-5 w-5" },
  lg: { box: "h-16 w-16 rounded-[18px]", icon: "h-8 w-8" },
} as const;

/** Solid colour square with a white glyph, like an iOS Settings icon. */
export function GlyphTile({
  icon: Icon,
  tone,
  size = "sm",
  className,
}: {
  icon: LucideIcon;
  tone: Tone;
  size?: keyof typeof GLYPH_SIZE;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-b text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
        GLYPH_BG[tone],
        GLYPH_SIZE[size].box,
        className,
      )}
      aria-hidden
    >
      <Icon className={GLYPH_SIZE[size].icon} strokeWidth={2.2} />
    </span>
  );
}

/** iOS inset grouped list: optional caption above, rounded card of rows, footnote below. */
export function InsetGroup({
  title,
  footer,
  children,
  className,
  "data-testid": testId,
}: {
  title?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <section className={className} data-testid={testId}>
      {title ? <h2 className="px-4 pb-1.5 text-[12.5px] font-medium uppercase tracking-wide text-zinc-500">{title}</h2> : null}
      <div className="divide-y divide-zinc-100 overflow-hidden rounded-[20px] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-zinc-200/60">
        {children}
      </div>
      {footer ? <p className="px-4 pt-1.5 text-[12px] leading-relaxed text-zinc-500">{footer}</p> : null}
    </section>
  );
}
