"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Baby, BedSingle, CalendarX2, PencilLine, Smile, UserRound, type LucideIcon } from "lucide-react";
import {
  CancellationLadder,
  rateFrom,
  seasonOn,
  type ChildRule,
  type HotelDetail,
  type HotelRepository,
} from "@/entities/hotel";
import { CancellationDialog, ChildPolicyDialog } from "@/features/hotel-policy";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/format";
import { Button, InfoSection, TONES, type Tone } from "@/shared/ui";

type Props = {
  detail: HotelDetail;
  repository: HotelRepository;
  canWrite: boolean;
  onChanged: () => void;
};

type BandRow = { key: "infant" | "child1" | "child2WithBed" | "child2NoBed"; icon: LucideIcon; tone: Tone; range: string };

export function PoliciesTab({ detail, repository, canWrite, onChanged }: Props) {
  const t = useTranslations("hotels");
  const locale = useLocale();
  const { hotel } = detail;
  const p = hotel.childPolicy;
  const [editChild, setEditChild] = useState(false);
  const [editCancel, setEditCancel] = useState(false);
  const season = seasonOn(detail.seasons, detail.today) ?? detail.seasons[0] ?? null;
  const adultReference = season ? Math.min(...season.rates.map(rateFrom).filter((v) => v > 0), Infinity) : 0;
  const reference = Number.isFinite(adultReference) ? adultReference : 0;
  const money = (v: number) => formatMoney(v, locale, hotel.currency);
  const upTo = (n: number) => `${n - 1}.99`;

  const rows: BandRow[] = [
    { key: "infant", icon: Baby, tone: "rose", range: `0 – ${upTo(p.infantMaxAge)}` },
    { key: "child1", icon: Smile, tone: "amber", range: `${p.infantMaxAge} – ${upTo(p.child1MaxAge)}` },
    { key: "child2WithBed", icon: BedSingle, tone: "sky", range: `${p.child1MaxAge} – ${upTo(p.child2MaxAge)}` },
    { key: "child2NoBed", icon: UserRound, tone: "violet", range: `${p.child1MaxAge} – ${upTo(p.child2MaxAge)}` },
  ];

  const ruleText = (r: ChildRule) =>
    r.mode === "free" ? t("policy.child.mode.free") : r.mode === "percent" ? t("policy.child.percentText", { pct: r.value }) : t("policy.child.fixedText", { amount: money(r.value) });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InfoSection
        icon={Baby}
        tone="rose"
        title={t("policy.child.title")}
        action={
          canWrite ? (
            <Button size="sm" variant="outline" onClick={() => setEditChild(true)} data-testid="child-policy-edit">
              <PencilLine className="h-4 w-4" aria-hidden />
              {t("policy.edit")}
            </Button>
          ) : null
        }
        data-testid="hotel-child-policy"
      >
        <ul className="space-y-2">
          {rows.map(({ key, icon: Icon, tone, range }) => (
            <li key={key} className={cn("flex items-center gap-3 rounded-[20px] bg-gradient-to-br p-3 ring-1 ring-inset ring-zinc-900/[0.04]", TONES[tone].tint)}>
              <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px]", TONES[tone].solid)} aria-hidden>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-zinc-900">{t(`policy.child.rule.${key}`)}</p>
                <p className="text-[12px] font-medium text-zinc-500">{t("policy.child.ageRange", { range })}</p>
              </div>
              <span className={cn("shrink-0 rounded-full px-3 py-1 text-[12.5px] font-bold", p[key].mode === "free" ? TONES.emerald.soft : TONES[tone].soft)}>{ruleText(p[key])}</span>
            </li>
          ))}
          <li className={cn("flex items-center gap-3 rounded-[20px] bg-gradient-to-br p-3 ring-1 ring-inset ring-zinc-900/[0.04]", TONES.teal.tint)}>
            <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px]", TONES.teal.solid)} aria-hidden>
              <BedSingle className="h-5 w-5" />
            </span>
            <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-zinc-900">{t("policy.child.extraBed")}</p>
            <span
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[12.5px] font-bold",
                p.extraBedAdult > 0 ? "bg-teal-50 text-teal-700" : "bg-zinc-100 text-zinc-500",
              )}
            >
              {p.extraBedAdult > 0 ? t("policy.child.fixedText", { amount: money(p.extraBedAdult) }) : t("policy.child.notContracted")}
            </span>
          </li>
        </ul>
      </InfoSection>

      <InfoSection
        icon={CalendarX2}
        tone="amber"
        title={t("policy.cancel.title")}
        action={
          canWrite ? (
            <Button size="sm" variant="outline" onClick={() => setEditCancel(true)} data-testid="cancellation-edit">
              <PencilLine className="h-4 w-4" aria-hidden />
              {t("policy.edit")}
            </Button>
          ) : null
        }
        data-testid="hotel-cancellation"
      >
        <CancellationLadder policy={hotel.cancellation} />
        <p className="mt-3 text-[12px] font-medium text-zinc-500">{t("policy.cancel.legend")}</p>
      </InfoSection>

      <ChildPolicyDialog repository={repository} hotel={hotel} adultReference={reference} open={editChild} onOpenChange={setEditChild} onSaved={onChanged} />
      <CancellationDialog repository={repository} hotel={hotel} open={editCancel} onOpenChange={setEditCancel} onSaved={onChanged} />
    </div>
  );
}
