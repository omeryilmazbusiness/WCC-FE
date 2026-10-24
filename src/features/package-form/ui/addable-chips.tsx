"use client";

import { useState } from "react";
import { Check, Plus, X, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Button, IconInput, TONES, type Tone } from "@/shared/ui";

type Option = { value: string; label: string; icon?: LucideIcon };

/**
 * Preset chips plus an Add field for free-text items (kit, ziyarat, districts).
 * Custom values that are not in `options` still render as removable chips.
 */
export function AddableChipSet({
  values,
  onChange,
  options,
  tone = "emerald",
  name,
  addLabel,
  placeholder,
}: {
  values: readonly string[];
  onChange: (v: string[]) => void;
  options?: readonly Option[];
  tone?: Tone;
  name: string;
  addLabel: string;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const presets = options ?? [];
  const extras = values.filter((v) => !presets.some((o) => o.value === v));

  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  }

  function add() {
    const next = draft.trim();
    if (next.length < 2) return;
    const exists = values.some((v) => v.toLowerCase() === next.toLowerCase());
    if (!exists) onChange([...values, next]);
    setDraft("");
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-2" role="group" aria-label={name}>
        {presets.map((o) => {
          const on = values.includes(o.value);
          const Icon = o.icon ?? Check;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(o.value)}
              data-testid={`${name}-${o.value}`}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition",
                on ? cn("border-transparent", TONES[tone].solid) : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2.2} aria-hidden />
              {o.label}
            </button>
          );
        })}
        {extras.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => toggle(v)}
            data-testid={`${name}-custom-${v}`}
            className={cn("inline-flex h-10 items-center gap-2 rounded-full border border-transparent px-3.5 text-[13px] font-semibold", TONES[tone].solid)}
          >
            {v}
            <X className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <IconInput
          icon={Plus}
          iconClassName={cn(TONES[tone].text)}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          dir="auto"
          placeholder={placeholder}
          aria-label={addLabel}
          data-testid={`${name}-add-input`}
        />
        <Button type="button" variant="outline" className="h-12 shrink-0 gap-1.5 rounded-2xl" onClick={add} data-testid={`${name}-add`}>
          <Plus className="h-4 w-4" aria-hidden />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
