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
import { Button } from "@/shared/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { login } from "../model/auth-api";
import { lockoutFrom, type Lockout } from "../model/lockout";
import { LockoutNotice } from "./lockout-notice";
import { MfaCodeStep } from "./mfa-code-step";
import { MfaSetupStep } from "./mfa-setup-step";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

const DEMO_DEFAULTS: FormValues = { email: "manager@wodi.local", password: "ChangeMe123!" };

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [lockout, setLockout] = useState<Lockout | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
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
      handleResult(await login(values.email, values.password));
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {lockout ? <LockoutNotice lockout={lockout} onElapsed={clearLockout} /> : null}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("email")}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("password")}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error ? (
          <p className="text-sm text-[var(--destructive)]" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting || locked}
        >
          {t("submit")}
        </Button>
      </form>
    </Form>
  );
}
