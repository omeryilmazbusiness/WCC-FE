"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type Props = {
  value: string;
  /** Accessible name, e.g. "Copy PNR". */
  label: string;
  className?: string;
};

/** Small icon button that copies `value` and briefly shows a check. */
export function CopyButton({ value, label, className }: Props) {
  const t = useTranslations("pii");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);

  return (
    <button
      type="button"
      aria-label={copied ? t("copied") : label}
      title={copied ? t("copied") : label}
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900",
        copied && "text-emerald-600",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
    </button>
  );
}
