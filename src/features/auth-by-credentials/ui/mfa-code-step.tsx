"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { isApiError, isNetworkError } from "@/shared/api/api-error";
import type { LoginResult } from "@/shared/api/auth-contract";
import { cn } from "@/shared/lib/cn";
import { verifyMfa } from "../model/auth-api";
import { lockoutFrom, type Lockout } from "../model/lockout";
import { GlassButton, GlassError, GlassLinkButton, glassInputClass } from "./glass-controls";

type Props = {
  challenge: string;
  onAuthenticated: (result: LoginResult) => void;
  onLockout: (lockout: Lockout) => void;
  onBack: (message?: string) => void;
};

const TOTP_PATTERN = /^\d{6}$/;

export function MfaCodeStep({ challenge, onAuthenticated, onLockout, onBack }: Props) {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<"totp" | "recovery">("totp");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const normalized = mode === "totp" ? code.replace(/\D/g, "") : code.trim();
  const valid = mode === "totp" ? TOTP_PATTERN.test(normalized) : normalized.length >= 6;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      onAuthenticated(await verifyMfa({ challenge, code: normalized }));
    } catch (err) {
      const lockout = lockoutFrom(err);
      if (lockout) {
        onLockout(lockout);
      } else if (isApiError(err) && (err.code === "challenge_expired" || err.status === 410)) {
        onBack(t("mfaChallengeExpired"));
      } else if (isNetworkError(err)) {
        setError(t("networkError"));
      } else {
        setError(t("mfaInvalid"));
      }
      setCode("");
    } finally {
      setSubmitting(false);
    }
  }

  const inputId = "mfa-code";

  return (
    <form onSubmit={submit} className="animate-setup-in space-y-5" data-testid="mfa-step">
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-[15px] bg-white/10 text-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_0_0.5px_rgba(255,255,255,0.14)]">
          <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <p className="mt-3 text-[17px] font-semibold text-white">{t("mfaTitle")}</p>
        <p className="mt-1 text-[13px] font-medium text-white/55">
          {mode === "totp" ? t("mfaSubtitle") : t("mfaRecoverySubtitle")}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor={inputId} className="sr-only">
          {mode === "totp" ? t("mfaCode") : t("mfaRecoveryCode")}
        </label>
        <div className="liquid-glass-group rounded-[18px] px-4 transition-shadow duration-200 focus-within:shadow-[inset_0_0_0_1px_rgba(125,211,252,0.45),0_0_0_4px_rgba(56,189,248,0.12)]">
          <input
            id={inputId}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode={mode === "totp" ? "numeric" : "text"}
            autoComplete="one-time-code"
            pattern={mode === "totp" ? "[0-9 ]*" : undefined}
            maxLength={mode === "totp" ? 7 : 32}
            placeholder={mode === "totp" ? "123456" : "xxxx-xxxx"}
            dir="ltr"
            className={cn(
              glassInputClass,
              "h-14 text-center font-mono",
              mode === "totp" ? "text-[22px] tracking-[0.5em]" : "text-[17px] tracking-wider",
            )}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
          />
        </div>
        {error ? <GlassError id={`${inputId}-error`}>{error}</GlassError> : null}
      </div>

      <GlassButton type="submit" busy={submitting} disabled={!valid || submitting}>
        {t("mfaVerify")}
      </GlassButton>

      <div className="flex items-center justify-between gap-3">
        <GlassLinkButton onClick={() => onBack()}>{t("mfaBack")}</GlassLinkButton>
        <GlassLinkButton
          onClick={() => {
            setMode(mode === "totp" ? "recovery" : "totp");
            setCode("");
            setError(null);
          }}
        >
          {mode === "totp" ? t("mfaUseRecovery") : t("mfaUseTotp")}
        </GlassLinkButton>
      </div>
    </form>
  );
}
