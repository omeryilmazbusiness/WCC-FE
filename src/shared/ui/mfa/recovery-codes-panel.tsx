"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Download, KeyRound } from "lucide-react";
import { Button } from "@/shared/ui/button";

type Props = {
  codes: string[];
  onDone: () => void;
};

/** Recovery codes are shown exactly once; nothing is persisted client-side. */
export function RecoveryCodesPanel({ codes, onDone }: Props) {
  const t = useTranslations("security");
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const text = codes.join("\n");

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const url = URL.createObjectURL(new Blob([`${text}\n`], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "wcc-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5" data-testid="recovery-codes">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <KeyRound className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-950">{t("recoveryTitle")}</p>
          <p className="mt-0.5 text-sm font-medium text-zinc-600">{t("recoveryHint")}</p>
        </div>
      </div>

      <ul
        className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-50 p-4 font-mono text-sm text-zinc-900 sm:grid-cols-3"
        aria-label={t("recoveryTitle")}
        dir="ltr"
      >
        {codes.map((code) => (
          <li key={code} className="rounded-xl bg-white px-3 py-2 text-center shadow-sm">
            {code}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void copy()}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? t("copied") : t("copyAll")}
        </Button>
        <Button type="button" variant="outline" onClick={download}>
          <Download className="h-4 w-4" />
          {t("download")}
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-zinc-300"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />
        {t("recoverySaved")}
      </label>

      <Button type="button" disabled={!acknowledged} onClick={onDone}>
        {t("done")}
      </Button>
    </div>
  );
}
