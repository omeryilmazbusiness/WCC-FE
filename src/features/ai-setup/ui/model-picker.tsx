"use client";

import { useId, useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";

type Props = {
  models: string[];
  /** Empty means the provider default (`models[0]`). */
  value: string;
  onChange: (v: string) => void;
  error?: string;
};

/** Suggested models as chips; "Other" reveals a free model ID field. */
export function ModelPicker({ models, value, onChange, error }: Props) {
  const t = useTranslations("aiSetup");
  const id = useId();
  const current = value.trim() || models[0] || "";
  const [custom, setCustom] = useState(() => Boolean(value.trim()) && !models.includes(value.trim()));

  return (
    <div className="space-y-2">
      <p id={id} className="text-[13px] font-semibold text-zinc-700">
        {t("model")}
      </p>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2" data-testid="ai-model-picker">
        {models.map((m, i) => {
          const on = !custom && current === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setCustom(false);
                onChange(i === 0 ? "" : m);
              }}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition",
                on ? "bg-zinc-950 text-white shadow-sm" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200/80",
              )}
              data-testid="ai-model-chip"
              dir="ltr"
            >
              {on ? <Check className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden /> : null}
              {m}
              {i === 0 ? <span className={cn("text-[11px]", on ? "text-white/60" : "text-zinc-400")}>· {t("recommended")}</span> : null}
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={custom}
          onClick={() => {
            setCustom(true);
            onChange("");
          }}
          className={cn(
            "inline-flex h-9 items-center rounded-full px-3.5 text-[13px] font-medium transition",
            custom ? "bg-zinc-950 text-white shadow-sm" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200/80",
          )}
          data-testid="ai-model-custom"
        >
          {t("otherModel")}
        </button>
      </div>
      {custom ? (
        <input
          type="text"
          name="ai-model"
          autoComplete="off"
          spellCheck={false}
          dir="ltr"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("modelPlaceholder")}
          aria-invalid={Boolean(error)}
          aria-label={t("model")}
          className={cn(
            "h-11 w-full rounded-2xl bg-zinc-100/80 px-4 font-mono text-[14px] text-zinc-950 placeholder:font-sans placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 rtl:text-right",
            error ? "ring-2 ring-rose-300" : "focus:ring-[#007AFF]/40",
          )}
          data-testid="ai-model-input"
        />
      ) : null}
      {error ? (
        <p role="alert" className="text-[12.5px] text-rose-600" data-testid="ai-model-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
