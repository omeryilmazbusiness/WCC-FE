"use client";

import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "@/shared/ui";

export type Choice<T extends string> = { value: T; label: string; icon?: LucideIcon; tone?: Tone; hint?: string };

type Common<T extends string> = {
  options: Choice<T>[];
  /** `tiles` lays choices out as large icon tiles; `chips` as pills. */
  variant?: "chips" | "tiles";
  testId?: string;
  "aria-label"?: string;
};

type Single<T extends string> = Common<T> & {
  multiple?: false;
  value: T | "";
  onChange: (value: T | "") => void;
  /** Tapping the selected choice clears it. */
  clearable?: boolean;
};

type Multiple<T extends string> = Common<T> & {
  multiple: true;
  value: T[];
  onChange: (value: T[]) => void;
};

/** Tappable, colour-coded choices: one (radio) or many (checkbox). */
export function ChoiceChips<T extends string>(props: Single<T> | Multiple<T>) {
  const { options, variant = "chips", testId } = props;
  const selected = (v: T) => (props.multiple ? props.value.includes(v) : props.value === v);

  function toggle(v: T) {
    if (props.multiple) {
      props.onChange(props.value.includes(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
    } else if (props.value === v) {
      if (props.clearable) props.onChange("");
    } else {
      props.onChange(v);
    }
  }

  return (
    <div
      role={props.multiple ? "group" : "radiogroup"}
      aria-label={props["aria-label"]}
      data-testid={testId}
      className={cn(variant === "tiles" ? "grid grid-cols-3 gap-2 sm:grid-cols-6" : "flex flex-wrap gap-2")}
    >
      {options.map((opt) => {
        const on = selected(opt.value);
        const tone = TONES[opt.tone ?? "zinc"];
        const Icon = opt.icon;
        const common = {
          type: "button" as const,
          role: props.multiple ? "checkbox" : "radio",
          "aria-checked": on,
          onClick: () => toggle(opt.value),
          "data-testid": testId ? `${testId}-${opt.value}` : undefined,
          title: opt.hint,
        };
        if (variant === "tiles") {
          return (
            <button
              key={opt.value}
              {...common}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-[20px] px-2 pb-3 pt-3.5 text-center transition-all duration-200",
                on
                  ? "bg-white shadow-[0_10px_24px_-14px_rgba(15,23,42,0.45)] ring-2 ring-zinc-900/80"
                  : "bg-zinc-50 ring-1 ring-inset ring-zinc-200/70 hover:bg-white hover:ring-zinc-300",
              )}
            >
              {Icon ? (
                <span
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-[16px] transition-all",
                    on ? tone.gradient : tone.soft,
                  )}
                  aria-hidden
                >
                  <Icon className="h-6 w-6" strokeWidth={2.1} />
                </span>
              ) : null}
              <span className={cn("text-[12.5px] font-semibold leading-tight", on ? "text-zinc-950" : "text-zinc-600")}>
                {opt.label}
              </span>
              {on ? (
                <span className="absolute end-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white" aria-hidden>
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              ) : null}
            </button>
          );
        }
        return (
          <button
            key={opt.value}
            {...common}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full pe-3.5 text-[13px] font-semibold transition-all duration-200",
              Icon ? "ps-1.5" : "ps-3.5",
              on
                ? cn(tone.soft, "shadow-sm ring-1 ring-inset ring-black/5")
                : "bg-zinc-50 text-zinc-600 ring-1 ring-inset ring-zinc-200/70 hover:bg-white hover:text-zinc-900",
            )}
          >
            {Icon ? (
              <span
                className={cn("flex h-7 w-7 items-center justify-center rounded-full", on ? tone.solid : "bg-white text-zinc-500 shadow-sm")}
                aria-hidden
              >
                <Icon className="h-4 w-4" strokeWidth={2.2} />
              </span>
            ) : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
