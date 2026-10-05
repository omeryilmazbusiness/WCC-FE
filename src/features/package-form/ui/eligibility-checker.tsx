"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertOctagon, CheckCircle2, Info, PlaneTakeoff, TriangleAlert, Cake, BookUser } from "lucide-react";
import { eligibilityIssues, type EligibilityIssue, type Requirements } from "@/entities/tourpackage";
import { cn } from "@/shared/lib/cn";
import { localDay } from "@/shared/lib/day";
import { formatDay } from "@/shared/lib/format";
import { IconInput, SegmentedControl, TONES } from "@/shared/ui";
import { Field } from "./controls";

const LEVEL = {
  block: { icon: AlertOctagon, tone: "rose" },
  warn: { icon: TriangleAlert, tone: "amber" },
  info: { icon: Info, tone: "sky" },
} as const;

/** Try a traveller against the package rules (passport validity, mahram, vaccination, photo). */
export function EligibilityChecker({ requirements, defaultDepartDate }: { requirements: Requirements; defaultDepartDate?: string }) {
  const t = useTranslations("packages");
  const locale = useLocale();
  const [passport, setPassport] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female">("female");
  const [depart, setDepart] = useState(defaultDepartDate || localDay());

  const issues = eligibilityIssues(requirements, { passportExpiresAt: passport || null, dateOfBirth: dob || null, gender }, depart || localDay());
  const blocking = issues.filter((i) => i.level !== "info");

  const label = (i: EligibilityIssue) =>
    i.code === "passport_short" ? t("eligibility.passport_short", { date: formatDay(i.until ?? "", locale) }) : t(`eligibility.${i.code}`);

  return (
    <div className="space-y-4" data-testid="eligibility-checker">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("form.requirements.departDate")}>
          <IconInput icon={PlaneTakeoff} iconClassName="text-sky-500" type="date" value={depart} onChange={(e) => setDepart(e.target.value)} aria-label={t("form.requirements.departDate")} />
        </Field>
        <Field label={t("form.requirements.passportExpiry")}>
          <IconInput icon={BookUser} iconClassName="text-violet-500" type="date" value={passport} onChange={(e) => setPassport(e.target.value)} aria-label={t("form.requirements.passportExpiry")} data-testid="eligibility-passport" />
        </Field>
        <Field label={t("form.requirements.dob")}>
          <IconInput icon={Cake} iconClassName="text-rose-500" type="date" value={dob} max={localDay()} onChange={(e) => setDob(e.target.value)} aria-label={t("form.requirements.dob")} />
        </Field>
        <Field label={t("form.requirements.gender")}>
          <SegmentedControl
            size="lg"
            className="flex w-full [&>button]:flex-1 [&>button]:justify-center"
            value={gender}
            onChange={setGender}
            options={[
              { value: "female", label: t("form.requirements.female") },
              { value: "male", label: t("form.requirements.male") },
            ]}
            aria-label={t("form.requirements.gender")}
          />
        </Field>
      </div>
      <ul className="space-y-2" aria-live="polite">
        {blocking.length === 0 ? (
          <li className={cn("flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-[13px] font-semibold", TONES.emerald.soft)} data-testid="eligibility-clear">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
            {t("form.requirements.allClear")}
          </li>
        ) : null}
        {issues.map((i) => {
          const look = LEVEL[i.level];
          const Icon = look.icon;
          return (
            <li key={i.code} className={cn("flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-[13px] font-semibold", TONES[look.tone].soft)} data-testid={`eligibility-${i.code}`}>
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              {label(i)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
