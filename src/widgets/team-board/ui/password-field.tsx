"use client";

import { useId, useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { generatePassword, passwordIssues, type PasswordIssue } from "@/entities/identity";
import { cn } from "@/shared/lib/cn";
import { IconInput, useToast } from "@/shared/ui";

const RULES: readonly PasswordIssue[] = ["length", "mix", "common"];

type Props = { value: string; onChange: (value: string) => void; label: string };

/** Password input with show/hide, a strong generator, copy and the API's rules as a live checklist. */
export function PasswordField({ value, onChange, label }: Props) {
  const t = useTranslations("team.password");
  const { push } = useToast();
  const id = useId();
  const [visible, setVisible] = useState(false);
  const issues = passwordIssues(value);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      push({ title: t("copied"), tone: "success" });
    } catch {
      push({ title: t("copyFailed"), tone: "error" });
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-[12.5px] font-semibold text-zinc-700">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <IconInput
            id={id}
            icon={KeyRound}
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pe-11 font-mono"
            aria-describedby={`${id}-rules`}
            data-testid="team-password"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label={visible ? t("hide") : t("show")}
          >
            {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(generatePassword());
            setVisible(true);
          }}
          className="flex h-12 items-center gap-1.5 rounded-xl bg-violet-50 px-3.5 text-[13px] font-semibold text-violet-700 transition hover:bg-violet-100"
          data-testid="team-password-generate"
        >
          <Wand2 className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{t("generate")}</span>
        </button>
        <button
          type="button"
          onClick={() => void copy()}
          disabled={!value}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 disabled:opacity-40"
          aria-label={t("copy")}
        >
          <Copy className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <ul id={`${id}-rules`} className="flex flex-wrap gap-x-4 gap-y-1">
        {RULES.map((rule) => {
          const ok = value.length > 0 && !issues.includes(rule);
          return (
            <li key={rule} className={cn("flex items-center gap-1.5 text-[12px]", ok ? "text-emerald-700" : "text-zinc-400")}>
              <span className={cn("flex h-4 w-4 items-center justify-center rounded-full", ok ? "bg-emerald-500 text-white" : "bg-zinc-200 text-transparent")} aria-hidden>
                <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
              </span>
              {t(`rule.${rule}`)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
