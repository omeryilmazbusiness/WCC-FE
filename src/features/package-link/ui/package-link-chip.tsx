"use client";

import { Package } from "lucide-react";
import { Link } from "@/shared/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";

type Props = {
  packageId: string;
  code: string;
  /** Full name, shown as the tooltip and next to the code when not compact. */
  name?: string;
  departureCode?: string;
  compact?: boolean;
  className?: string;
};

/** Amber chip that deep-links to the package page; used wherever a record carries a package. */
export function PackageLinkChip({ packageId, code, name, departureCode, compact, className }: Props) {
  const text = code || name || packageId.slice(0, 8);
  return (
    <Link
      href={routes.package(packageId)}
      title={[code, name, departureCode].filter(Boolean).join(" · ")}
      onClick={(e) => e.stopPropagation()}
      data-testid={`package-chip-${code || packageId}`}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors hover:brightness-95",
        TONES.amber.soft,
        className,
      )}
    >
      <Package className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span dir="ltr" className="shrink-0 font-mono tracking-wide">
        {text}
      </span>
      {!compact && name && code ? <span className="truncate font-medium opacity-80">{name}</span> : null}
      {departureCode ? (
        <span dir="ltr" className="shrink-0 font-mono opacity-70">
          · {departureCode}
        </span>
      ) : null}
    </Link>
  );
}
