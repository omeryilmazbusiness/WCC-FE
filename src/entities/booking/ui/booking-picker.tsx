"use client";

import { useEffect, useState } from "react";
import { Check, Search, Ticket } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { IconInput } from "@/shared/ui";
import type { Booking } from "../model";

type Props = {
  search: (q: string) => Promise<Booking[]>;
  value: Booking | null;
  onChange: (b: Booking) => void;
  placeholder: string;
  emptyLabel: string;
  formatAmount: (b: Booking) => string;
  initialQuery?: string;
  testId?: string;
};

/** Debounced booking search with a tappable result list (ref, PNR or customer name). */
export function BookingPicker({ search, value, onChange, placeholder, emptyLabel, formatAmount, initialQuery = "", testId }: Props) {
  const [q, setQ] = useState(initialQuery);
  const [rows, setRows] = useState<Booking[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    const handle = window.setTimeout(() => {
      setBusy(true);
      search(q.trim())
        .then((r) => live && setRows(r.slice(0, 8)))
        .catch(() => live && setRows([]))
        .finally(() => live && setBusy(false));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(handle);
    };
  }, [q, search]);

  return (
    <div className="space-y-2" data-testid={testId}>
      <IconInput icon={Search} value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      <ul className={cn("max-h-64 space-y-1.5 overflow-y-auto", busy && "opacity-60")} aria-busy={busy}>
        {rows.length === 0 && !busy ? <li className="py-4 text-center text-[12.5px] text-zinc-400">{emptyLabel}</li> : null}
        {rows.map((b) => {
          const on = value?.id === b.id;
          return (
            <li key={b.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onChange(b)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[18px] border p-2.5 text-start transition",
                  on ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900" : "border-zinc-200/70 hover:bg-zinc-50",
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-indigo-50 text-indigo-700" aria-hidden>
                  {on ? <Check className="h-5 w-5" /> : <Ticket className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-zinc-900">
                    {b.refCode || b.id.slice(0, 8)} {b.pnr ? <span className="font-medium text-zinc-400">· {b.pnr}</span> : null}
                  </span>
                  <span className="block truncate text-[12px] text-zinc-500">{b.info.customerName}</span>
                </span>
                <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-zinc-700">{formatAmount(b)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
