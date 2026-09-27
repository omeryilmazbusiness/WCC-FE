"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { isApiError, isNetworkError } from "@/shared/api/api-error";
import type { LoginResult } from "@/shared/api/auth-contract";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { verifyMfa } from "../model/auth-api";
import { lockoutFrom, type Lockout } from "../model/lockout";

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
    <form onSubmit={submit} className="space-y-5" data-testid="mfa-step">
      <div className="flex items-start gap-3 rounded-2xl bg-zinc-50 p-4">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white">
          <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-950">{t("mfaTitle")}</p>
          <p className="mt-0.5 text-sm font-medium text-zinc-500">
            {mode === "totp" ? t("mfaSubtitle") : t("mfaRecoverySubtitle")}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={inputId}>{mode === "totp" ? t("mfaCode") : t("mfaRecoveryCode")}</Label>
        <Input
          id={inputId}
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode={mode === "totp" ? "numeric" : "text"}
          autoComplete="one-time-code"
          pattern={mode === "totp" ? "[0-9 ]*" : undefined}
          maxLength={mode === "totp" ? 7 : 32}
          placeholder={mode === "totp" ? "123456" : "xxxx-xxxx"}
          className={mode === "totp" ? "text-center font-mono text-lg tracking-[0.5em]" : "font-mono"}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        {error ? (
          <p id={`${inputId}-error`} role="alert" className="text-sm text-[var(--destructive)]">
            {error}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={!valid || submitting}>
        {t("mfaVerify")}
      </Button>

      <div className="flex items-center justify-between text-sm font-medium">
        <button
          type="button"
          className="text-zinc-500 transition-colors hover:text-zinc-950"
          onClick={() => onBack()}
        >
          {t("mfaBack")}
        </button>
        <button
          type="button"
          className="text-zinc-500 transition-colors hover:text-zinc-950"
          onClick={() => {
            setMode(mode === "totp" ? "recovery" : "totp");
            setCode("");
            setError(null);
          }}
        >
          {mode === "totp" ? t("mfaUseRecovery") : t("mfaUseTotp")}
        </button>
      </div>
    </form>
  );
}
