"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plane } from "lucide-react";
import { BSP_LOOK, BSP_STATUSES, type BspDetail, type BspStatus } from "@/entities/finance";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/format";
import { ActionDialog, TONES } from "@/shared/ui";

type Props = { detail: BspDetail; open: boolean; onOpenChange: (open: boolean) => void };

const PAGE = 200;

/** Line-by-line BSP comparison, problems first. */
export function BspDetailDialog({ detail: d, open, onOpenChange }: Props) {
  const t = useTranslations("financeHub");
  const locale = useLocale();
  const [status, setStatus] = useState<BspStatus | null>(d.lines.some((l) => l.status !== "matched") ? null : "matched");
  const lines = useMemo(() => (status ? d.lines.filter((l) => l.status === status) : d.lines), [d.lines, status]);
  const counts: Record<BspStatus, number> = { matched: d.matched, amount_mismatch: d.mismatched, missing_in_system: d.missingSystem, missing_in_bsp: d.missingBsp };
  const money = (v: number) => formatMoney(v, locale, d.currency);

  return (
    <ActionDialog open={open} onOpenChange={onOpenChange} icon={Plane} tone="indigo" size="xl" title={d.label} description={`${d.periodStart} → ${d.periodEnd}`} testId="finance-bsp-detail">
      <div className="grid grid-cols-3 gap-2.5">
        <Figure label={t("recon.bspTotal")} value={money(d.total)} />
        <Figure label={t("recon.systemTotal")} value={money(d.systemTotal)} />
        <Figure label={t("recon.difference")} value={money(d.difference)} warn={d.difference !== 0} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip active={status === null} onClick={() => setStatus(null)} label={t("receivables.all")} count={d.lines.length} tone="zinc" />
        {BSP_STATUSES.map((s) => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)} label={t(`bspStatus.${s}`)} count={counts[s]} tone={BSP_LOOK[s].tone} />
        ))}
      </div>
      <div className="overflow-x-auto rounded-[18px] border border-zinc-100">
        <table className="w-full text-[12.5px]">
          <thead className="bg-zinc-50 text-[11px] uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-start">{t("recon.document")}</th>
              <th className="px-3 py-2 text-start">PNR</th>
              <th className="px-3 py-2 text-start">{t("recon.passenger")}</th>
              <th className="px-3 py-2 text-end">BSP</th>
              <th className="px-3 py-2 text-end">{t("recon.system")}</th>
              <th className="px-3 py-2 text-start">{t("recon.status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {lines.slice(0, PAGE).map((l) => {
              const Icon = BSP_LOOK[l.status].icon;
              return (
                <tr key={l.id}>
                  <td className="px-3 py-2 font-mono" dir="ltr">
                    {l.documentNo || "—"}
                  </td>
                  <td className="px-3 py-2 font-mono" dir="ltr">
                    {l.pnr || "—"}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2">{l.passenger || "—"}</td>
                  <td className="px-3 py-2 text-end tabular-nums">{l.status === "missing_in_bsp" ? "—" : money(l.amount)}</td>
                  <td className="px-3 py-2 text-end tabular-nums">{l.systemAmount === null ? "—" : money(l.systemAmount)}</td>
                  <td className="px-3 py-2">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", TONES[BSP_LOOK[l.status].tone].soft)}>
                      <Icon className="h-3 w-3" aria-hidden />
                      {t(`bspStatus.${l.status}`)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {lines.length > PAGE ? <p className="text-[12px] text-zinc-400">{t("recon.moreLines", { count: lines.length - PAGE })}</p> : null}
    </ActionDialog>
  );
}

function Figure({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={cn("rounded-[18px] p-3", warn ? "bg-rose-50" : "bg-zinc-50")}>
      <div className="text-[11.5px] font-semibold text-zinc-500">{label}</div>
      <div className={cn("text-[16px] font-bold tabular-nums", warn ? "text-rose-700" : "text-zinc-900")}>{value}</div>
    </div>
  );
}

function Chip({ active, onClick, label, count, tone }: { active: boolean; onClick: () => void; label: string; count: number; tone: keyof typeof TONES }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn("inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[12.5px] font-semibold transition", active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300")}
    >
      <span className={cn("h-2 w-2 rounded-full", TONES[tone].dot)} />
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}
