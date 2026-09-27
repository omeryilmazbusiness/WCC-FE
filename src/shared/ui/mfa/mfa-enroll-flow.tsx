"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import { isApiError } from "@/shared/api/api-error";
import { Button } from "@/shared/ui/button";
import { useMutationFeedback } from "@/shared/ui/use-mutation-feedback";
import { RecoveryCodesPanel } from "./recovery-codes-panel";
import { TotpInput } from "./totp-input";
import { formatSecret, TOTP_CODE_PATTERN } from "./totp";

export type MfaEnrollment = { secret: string; otpauth_url: string };

type Props = {
  enrollment: MfaEnrollment;
  /** Confirms the first code and returns the one-time recovery codes. */
  confirm: (code: string) => Promise<{ recovery_codes?: string[] }>;
  onCancel?: () => void;
  onEnabled: () => void;
};

export function MfaEnrollFlow({ enrollment, confirm, onCancel, onEnabled }: Props) {
  const t = useTranslations("security");
  const feedback = useMutationFeedback();
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(enrollment.otpauth_url, { margin: 1, width: 208 })
      .then((url) => active && setQr(url))
      .catch(() => active && setQr(null));
    return () => {
      active = false;
    };
  }, [enrollment.otpauth_url]);

  async function copySecret() {
    await navigator.clipboard.writeText(enrollment.secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!TOTP_CODE_PATTERN.test(code) || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await confirm(code);
      setRecoveryCodes(res.recovery_codes ?? []);
      feedback.success(t("enabledToast"));
    } catch (err) {
      if (isApiError(err) && (err.status === 400 || err.status === 401 || err.status === 422)) {
        setError(t("invalidCode"));
      } else {
        feedback.error(err, t("enableError"));
      }
      setCode("");
    } finally {
      setSubmitting(false);
    }
  }

  if (recoveryCodes) {
    return <RecoveryCodesPanel codes={recoveryCodes} onDone={onEnabled} />;
  }

  return (
    <form onSubmit={submit} className="space-y-6" data-testid="mfa-enroll">
      <ol className="space-y-6">
        <li className="space-y-3">
          <p className="text-sm font-semibold text-zinc-950">{t("stepScan")}</p>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-[224px] w-[224px] shrink-0 items-center justify-center rounded-[20px] border border-zinc-200/70 bg-white p-2">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt={t("qrAlt")} width={208} height={208} className="rounded-xl" />
              ) : (
                <span className="text-xs font-medium text-zinc-400">…</span>
              )}
            </div>
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium text-zinc-500">{t("manualEntry")}</p>
              <code
                dir="ltr"
                className="block break-all rounded-xl bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900"
                data-testid="mfa-secret"
              >
                {formatSecret(enrollment.secret)}
              </code>
              <Button type="button" variant="outline" size="sm" onClick={() => void copySecret()}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? t("copied") : t("copySecret")}
              </Button>
            </div>
          </div>
        </li>
        <li className="max-w-xs space-y-3">
          <p className="text-sm font-semibold text-zinc-950">{t("stepVerify")}</p>
          <TotpInput id="mfa-confirm-code" label={t("code")} value={code} onChange={setCode} error={error} />
        </li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!TOTP_CODE_PATTERN.test(code) || submitting}>
          {t("enable")}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
