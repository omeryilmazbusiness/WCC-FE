"use client";

import { useId, useState } from "react";
import { ArrowUpRight, Eye, EyeOff, KeyRound, LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";
import { providerInfo, type AIProvider, type AIProviderInfo, type KeyIssue } from "@/entities/ai";
import { cn } from "@/shared/lib/cn";
import { SegmentedControl } from "@/shared/ui";
import type { KeyMode } from "../model/use-ai-setup-form";

type Props = {
  info: AIProviderInfo;
  value: string;
  onChange: (v: string) => void;
  issue: KeyIssue | null;
  /** Message from the provider check (invalid key, quota). */
  serverMessage?: string;
  suggested: AIProvider | null;
  onSwitch: (p: AIProvider) => void;
  /** Masked stored key, e.g. `••••JE5Q`. */
  storedHint: string;
  canKeep: boolean;
  mode: KeyMode;
  onModeChange: (m: KeyMode) => void;
};

/** Keep the saved key or paste a new one; the choice can be undone until saving. */
export function ApiKeyField({ info, value, onChange, issue, serverMessage, suggested, onSwitch, storedHint, canKeep, mode, onModeChange }: Props) {
  const t = useTranslations("aiSetup");
  const id = useId();
  const [visible, setVisible] = useState(false);
  const error = serverMessage ?? (issue ? t(`keyIssues.${issue}`, { provider: providerInfo(suggested)?.name ?? "" }) : undefined);

  return (
    <div className="space-y-2.5" data-testid="ai-key-field" data-mode={mode}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={mode === "replace" ? id : undefined} className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-700">
          <KeyRound className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
          {t("apiKey")}
        </label>
        <a
          href={info.keyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-[12.5px] font-medium text-[#007AFF] hover:underline"
          data-testid="ai-key-link"
        >
          {t("getKey", { provider: info.name })}
          <ArrowUpRight className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
        </a>
      </div>

      {canKeep ? (
        <SegmentedControl<KeyMode>
          value={mode}
          onChange={onModeChange}
          aria-label={t("apiKey")}
          options={[
            { value: "keep", label: t("keyMode.keep") },
            { value: "replace", label: t("keyMode.replace") },
          ]}
        />
      ) : null}

      {mode === "keep" ? (
        <div className="flex h-12 items-center gap-3 rounded-2xl bg-emerald-50/70 px-4 ring-1 ring-emerald-100" data-testid="ai-key-kept">
          <LockKeyhole className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <span className="font-mono text-[14px] text-zinc-900" dir="ltr">
            {storedHint || "••••"}
          </span>
          <span className="ms-auto text-[12.5px] font-medium text-emerald-700">{t("keySaved")}</span>
        </div>
      ) : (
        <div
          className={cn(
            "flex h-12 items-center rounded-2xl bg-zinc-100/80 pe-1.5 transition focus-within:bg-white focus-within:ring-2",
            error ? "ring-2 ring-rose-300 focus-within:ring-rose-300" : "focus-within:ring-[#007AFF]/40",
          )}
        >
          <input
            id={id}
            type={visible ? "text" : "password"}
            name="ai-api-key"
            autoComplete="off"
            spellCheck={false}
            dir="ltr"
            autoFocus={canKeep}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t("keyPlaceholderFor", { hint: info.hint })}
            aria-invalid={Boolean(error)}
            aria-describedby={`${id}-help`}
            className="h-full min-w-0 flex-1 bg-transparent px-4 font-mono text-[14px] text-zinc-950 placeholder:font-sans placeholder:text-zinc-400 focus:outline-none rtl:text-right"
            data-testid="ai-key-input"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-200/70"
            aria-label={visible ? t("hideKey") : t("showKey")}
            aria-pressed={visible}
          >
            {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      )}

      <div id={`${id}-help`} className="min-h-[1.25rem] text-[12.5px]">
        {error ? (
          <span role="alert" className="flex flex-wrap items-center gap-x-2 text-rose-600" data-testid="ai-key-error" data-issue={issue ?? "server"}>
            {error}
            {suggested && !serverMessage ? (
              <button type="button" onClick={() => onSwitch(suggested)} className="font-semibold text-[#007AFF] hover:underline" data-testid="ai-key-switch">
                {t("switchTo", { provider: providerInfo(suggested)?.name ?? suggested })}
              </button>
            ) : null}
          </span>
        ) : (
          <span className="text-zinc-500">{mode === "keep" ? t("keyKept") : canKeep ? t("keyReplacing") : t("keyPrivacy")}</span>
        )}
      </div>
    </div>
  );
}
