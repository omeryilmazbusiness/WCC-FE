"use client";

import { useRef, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { AI_PROVIDERS, type AIProvider } from "@/entities/ai";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";
import { PROVIDER_LOOK } from "../model/provider-look";

type Props = { value: AIProvider; connected?: AIProvider | null; onChange: (p: AIProvider) => void };

/** Three large provider cards as one radio group (arrow keys move the choice). */
export function ProviderPicker({ value, connected, onChange }: Props) {
  const t = useTranslations("aiSetup");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: KeyboardEvent, index: number) {
    let step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && document.dir === "rtl") step = -step;
    const next = (index + step + AI_PROVIDERS.length) % AI_PROVIDERS.length;
    onChange(AI_PROVIDERS[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={t("chooseProvider")} className="grid gap-2.5 sm:grid-cols-3" data-testid="ai-provider-picker">
      {AI_PROVIDERS.map((p, i) => {
        const look = PROVIDER_LOOK[p.id];
        const Icon = look.icon;
        const selected = p.id === value;
        return (
          <button
            key={p.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(p.id)}
            onKeyDown={(e) => onKey(e, i)}
            data-testid="ai-provider-option"
            data-provider={p.id}
            className={cn(
              "relative flex items-center gap-3 rounded-[22px] bg-white p-3.5 text-start transition-all duration-200 sm:flex-col sm:items-start sm:gap-3 sm:p-4",
              selected
                ? "ring-2 ring-[#007AFF] shadow-[0_14px_30px_-18px_rgba(0,122,255,0.55)]"
                : "ring-1 ring-zinc-200/70 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-22px_rgba(24,24,27,0.35)]",
            )}
          >
            <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px]", TONES[look.tone].gradient)}>
              <Icon className="h-6 w-6" strokeWidth={1.9} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[15px] font-semibold text-zinc-950">
                {p.name}
                {connected === p.id ? (
                  <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-700">{t("current")}</span>
                ) : null}
              </span>
              <span className="block truncate text-[12.5px] text-zinc-500">{t(`providers.${p.id}`)}</span>
            </span>
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition sm:absolute sm:end-3 sm:top-3",
                selected ? "bg-[#007AFF] text-white" : "ring-1 ring-zinc-300",
              )}
              aria-hidden
            >
              {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
