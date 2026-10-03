"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Bell, Mail, Smartphone, type LucideIcon } from "lucide-react";
import type { NotificationPreference } from "@/entities/notification";
import { cn } from "@/shared/lib/cn";
import { Button, TONES, type Tone } from "@/shared/ui";

type Channels = { emailEnabled: boolean; pushEnabled: boolean };

type Props = {
  prefs: NotificationPreference | null;
  onSave: (input: Channels) => Promise<unknown>;
  onDone: () => void;
};

/** Alert channels as an iOS settings group: in-app is mandatory, email and push are switches. */
export function BellPreferences({ prefs, onSave, onDone }: Props) {
  const t = useTranslations("notifications");
  const [email, setEmail] = useState(prefs?.emailEnabled ?? false);
  const [push, setPush] = useState(prefs?.pushEnabled ?? false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave({ emailEnabled: email, pushEnabled: push });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 p-3">
      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-[18px] bg-white ring-1 ring-zinc-200/70">
        <ChannelRow icon={Bell} tone="rose" label={t("inApp")}>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-500">{t("mandatory")}</span>
        </ChannelRow>
        <ChannelRow icon={Mail} tone="sky" label={t("email")}>
          <IosSwitch checked={email} onChange={setEmail} label={t("email")} />
        </ChannelRow>
        <ChannelRow icon={Smartphone} tone="violet" label={t("push")}>
          <IosSwitch checked={push} onChange={setPush} label={t("push")} />
        </ChannelRow>
      </ul>
      <p className="px-1 text-[12px] leading-relaxed text-zinc-500">{t("prefsHint")}</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={onDone}>
          {t("cancel")}
        </Button>
        <Button type="button" size="sm" className="rounded-full" disabled={saving} onClick={() => void save().catch(() => undefined)}>
          {t("savePrefs")}
        </Button>
      </div>
    </div>
  );
}

function ChannelRow({ icon: Icon, tone, label, children }: { icon: LucideIcon; tone: Tone; label: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]", TONES[tone].gradient)} aria-hidden>
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-zinc-900">{label}</span>
      {children}
    </li>
  );
}

function IosSwitch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
        checked ? "bg-emerald-500" : "bg-zinc-200",
      )}
    >
      <span
        className={cn(
          "h-[22px] w-[22px] rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.25)] transition-transform duration-200",
          checked ? "translate-x-[18px] rtl:-translate-x-[18px]" : "translate-x-0",
        )}
      />
    </button>
  );
}
