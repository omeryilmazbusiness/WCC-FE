"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { REVEAL_MS } from "@/shared/lib/pii";
import { useCountdown } from "@/shared/lib/use-countdown";
import { Button } from "./button";
import { useMutationFeedback } from "./use-mutation-feedback";

type Props = {
  /** Identity of the secret's owner; a revealed value is only shown for the same id. */
  id: string;
  /** Masked value from the API, e.g. "••••1234". */
  masked: string;
  /** Show the "Show" button (caller checks `pii.read`). */
  canReveal: boolean;
  /** Fetches the full value from the audited reveal endpoint. */
  onReveal: () => Promise<string>;
  emptyLabel?: string;
  className?: string;
};

type Revealed = { id: string; value: string; until: number };

/**
 * Masked PII with an on-demand reveal. The full value lives only in this component's
 * state: it is never cached, re-masks after {@link REVEAL_MS} and is dropped on unmount.
 */
export function MaskedSecret({ id, masked, canReveal, onReveal, emptyLabel = "—", className }: Props) {
  const t = useTranslations("pii");
  const feedback = useMutationFeedback();
  const [revealed, setRevealed] = useState<Revealed | null>(null);
  const [busy, setBusy] = useState(false);
  if (revealed && (revealed.id !== id || !canReveal)) setRevealed(null);
  const current = revealed?.id === id && canReveal ? revealed : null;
  const remaining = useCountdown(current?.until ?? null);

  useEffect(() => {
    if (!revealed) return;
    const timer = window.setTimeout(() => setRevealed(null), Math.max(0, revealed.until - Date.now()));
    return () => window.clearTimeout(timer);
  }, [revealed]);

  if (!masked) return <span className={cn("text-zinc-400", className)}>{emptyLabel}</span>;

  async function reveal() {
    setBusy(true);
    try {
      const value = await onReveal();
      setRevealed({ id, value, until: Date.now() + REVEAL_MS });
    } catch (err) {
      feedback.error(err, t("revealError"));
    } finally {
      setBusy(false);
    }
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      feedback.success(t("copied"));
    } catch (err) {
      feedback.error(err, t("copyError"));
    }
  }

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)} data-testid="masked-secret">
      <bdi dir="ltr" className="font-mono text-[13px] tracking-wide" data-testid="masked-secret-value">
        {current?.value ?? masked}
      </bdi>
      {current ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => void copy(current.value)}
            aria-label={t("copy")}
            title={t("copy")}
          >
            <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setRevealed(null)}
            aria-label={t("hide")}
            title={t("hide")}
          >
            <EyeOff className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Button>
          <span className="text-[11px] font-medium text-zinc-400" aria-live="polite">
            {t("hidesIn", { seconds: remaining })}
          </span>
        </>
      ) : null}
      {canReveal && !current ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          disabled={busy}
          onClick={() => void reveal()}
          aria-label={t("showAria")}
          data-testid="masked-secret-show"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
          ) : (
            <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
          )}
          {t("show")}
        </Button>
      ) : null}
    </span>
  );
}
