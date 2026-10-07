"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";
import { SupportStatusPill, type SupportRequest } from "@/entities/support";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, formatRelativeTime } from "@/shared/lib/format";

/** One request in a list: summary line that expands into `children`. */
export function RequestRow({
  request,
  subtitle,
  children,
  defaultOpen = false,
}: {
  request: SupportRequest;
  subtitle?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const locale = useLocale();
  const panel = useId();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div data-testid="support-row" data-number={request.number}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panel}
        className="flex w-full items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none"
      >
        <span className="mt-0.5 shrink-0 text-[12px] font-semibold tabular-nums text-zinc-400" dir="ltr">
          #{request.number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-medium text-zinc-950">{request.title}</span>
          <span className="block truncate text-[12.5px] text-zinc-500">
            {subtitle ? <>{subtitle} · </> : null}
            <time dateTime={request.createdAt} title={formatDateTime(request.createdAt, locale)}>
              {formatRelativeTime(request.createdAt, locale)}
            </time>
          </span>
        </span>
        <SupportStatusPill status={request.status} />
        <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div id={panel} className="space-y-3 px-4 pb-4 ps-[3.25rem]">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function Description({ text }: { text: string }) {
  return <p className="whitespace-pre-line break-words text-[14px] leading-relaxed text-zinc-700">{text}</p>;
}
