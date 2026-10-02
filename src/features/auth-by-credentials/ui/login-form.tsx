"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { isApiError, isNetworkError } from "@/shared/api/api-error";
import type { LoginResult } from "@/shared/api/auth-contract";
import { env } from "@/shared/config/env";
import { routes } from "@/shared/config/routes";
import { applyFieldErrors } from "@/shared/lib/form-errors";
import { Eye, EyeOff } from "lucide-react";
import { login } from "../model/auth-api";
import { lockoutFrom, type Lockout } from "../model/lockout";
import { GlassButton, GlassError, GlassGroup, GlassRow, glassInputClass } from "./glass-controls";
import { LockoutNotice } from "./lockout-notice";
import { MfaCodeStep } from "./mfa-code-step";
import { MfaSetupStep } from "./mfa-setup-step";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

const DEMO_DEFAULTS: FormValues = { email: "manager@wodi.local", password: "ChangeMe123!" };

type Props = {
  /** Set on a company's own login page: only that company's accounts may sign in. */
  company?: string;
};

export function LoginForm({ company }: Props = {}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [lockout, setLockout] = useState<Lockout | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: env.demoMode ? DEMO_DEFAULTS : { email: "", password: "" },
  });

  const clearLockout = useCallback(() => setLockout(null), []);
  const navigate = useCallback(
    // Full navigation so the server layout reads the freshly set HttpOnly cookies.
    (target: string) => window.location.assign(`/${locale}${target}`),
    [locale],
  );
  const leaveSetup = useCallback(
    (message?: string) => {
      setSetupRequired(false);
      setError(message ?? null);
      form.resetField("password");
    },
    [form],
  );

  function handleResult(result: LoginResult) {
    if (result.status === "mfa_required") {
      setChallenge(result.challenge);
      return;
    }
    if (result.status === "mfa_setup_required") {
      setChallenge(null);
      setSetupRequired(true);
      return;
    }
    navigate(
      result.status === "mfa_enrollment_required" ? `${routes.security}?enroll=required` : result.home,
    );
  }

  function handleLockout(next: Lockout) {
    setChallenge(null);
    setError(null);
    setLockout(next);
  }

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      handleResult(await login(values.email, values.password, company));
    } catch (err) {
      const next = lockoutFrom(err);
      if (next) {
        handleLockout(next);
      } else if (applyFieldErrors(form.setError, err, ["email", "password"])) {
        return;
      } else if (isNetworkError(err)) {
        setError(t("networkError"));
      } else if (isApiError(err) && err.status === 401) {
        setError(t("error"));
      } else {
        setError(t("genericError"));
      }
    }
  }

  if (setupRequired) {
    return <MfaSetupStep onComplete={navigate} onBack={leaveSetup} />;
  }

  if (challenge) {
    return (
      <MfaCodeStep
        challenge={challenge}
        onAuthenticated={handleResult}
        onLockout={handleLockout}
        onBack={(message) => {
          setChallenge(null);
          setError(message ?? null);
          form.resetField("password");
        }}
      />
    );
  }

  const locked = lockout !== null;
  const { errors, isSubmitting } = form.formState;
  const fieldError = errors.email?.message ?? errors.password?.message;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {lockout ? <LockoutNotice lockout={lockout} onElapsed={clearLockout} /> : null}
      <GlassGroup invalid={Boolean(fieldError || error)}>
        <GlassRow label={t("email")} htmlFor="login-email">
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={t("emailPlaceholder")}
            dir="ltr"
            className={`${glassInputClass} rtl:text-right`}
            aria-invalid={Boolean(errors.email)}
            {...form.register("email")}
          />
        </GlassRow>
        <GlassRow label={t("password")} htmlFor="login-password">
          <input
            id="login-password"
            type={revealed ? "text" : "password"}
            autoComplete="current-password"
            placeholder={t("passwordPlaceholder")}
            className={glassInputClass}
            aria-invalid={Boolean(errors.password)}
            {...form.register("password")}
          />
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? t("hidePassword") : t("showPassword")}
            aria-pressed={revealed}
            className="-me-1.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/10 hover:text-white"
          >
            {revealed ? <EyeOff className="h-4 w-4" strokeWidth={1.9} /> : <Eye className="h-4 w-4" strokeWidth={1.9} />}
          </button>
        </GlassRow>
      </GlassGroup>
      {fieldError ? <GlassError>{fieldError}</GlassError> : null}
      {error ? <GlassError>{error}</GlassError> : null}
      <div className="pt-2">
        <GlassButton type="submit" busy={isSubmitting} disabled={isSubmitting || locked}>
          {t("signIn")}
        </GlassButton>
      </div>
    </form>
  );
}
