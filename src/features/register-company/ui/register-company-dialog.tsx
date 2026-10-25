"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  Building2,
  Copy,
  Globe2,
  ImageUp,
  KeyRound,
  Mail,
  MapPin,
  MapPinned,
  RefreshCw,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { registerCompany } from "@/entities/company";
import type { CompanyPlan } from "@/entities/company";
import {
  companyLogoUrl,
  createCompanyBrandingApi,
  logoProblem,
  LOGO_TYPES,
} from "@/entities/company-branding";
import { generatePassword, slugify } from "@/features/gm-setup/model/flow";
import { isApiError } from "@/shared/api/api-error";
import {
  ActionDialog,
  Button,
  Field,
  FormSection,
  IconInput,
  Input,
  Textarea,
  useMutationFeedback,
} from "@/shared/ui";
import { ADDRESS_MAX, CITY_MAX, COUNTRY_MAX } from "@/entities/company";
import {
  EMPTY_REGISTER_FORM,
  REGISTER_SERVER_FIELDS,
  registerCompanyHints,
  registerCompanyPayload,
  type RegisterCompanyForm,
  type RegisterField,
} from "../model/form";
import { PlanPicker } from "./plan-picker";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered: () => void;
};

type Done = {
  companyId: string;
  url: string;
  loginPath: string;
  email: string;
  password: string;
  pendingLogo: File | null;
};

const LOGO_TILE =
  "flex shrink-0 items-center justify-center overflow-hidden shadow-[0_0_0_0.5px_rgba(15,23,42,0.12),0_4px_10px_-6px_rgba(15,23,42,0.35)]";

function MonogramTile({ name, className }: { name: string; className: string }) {
  return (
    <span
      aria-hidden
      className={`${LOGO_TILE} ${className} bg-[linear-gradient(145deg,#38bdf8_0%,#6366f1_52%,#a855f7_100%)] font-semibold text-white`}
    >
      {(name.trim()[0] ?? "?").toLocaleUpperCase()}
    </span>
  );
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-[12px] font-medium text-rose-600">
      {children}
    </p>
  );
}

function LogoPicker({
  file,
  name,
  error,
  onPick,
  onError,
}: {
  file: File | null;
  name: string;
  error: string | null;
  onPick: (file: File | null) => void;
  onError: (message: string | null) => void;
}) {
  const t = useTranslations("adminCompanies.form");
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0];
    e.target.value = "";
    if (!next) return;
    const issue = logoProblem(next);
    if (issue) {
      onError(t(issue === "type" ? "errors.logoType" : "errors.logoSize"));
      return;
    }
    onError(null);
    onPick(next);
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[12.5px] font-semibold text-zinc-600">{t("fields.logo")}</p>
      <div className="flex items-center gap-3">
        {preview ? (
          <span className={`${LOGO_TILE} h-16 w-16 rounded-[20px] bg-white p-1.5`} data-testid="company-logo-preview">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img
              src={preview}
              alt=""
              className="h-full w-full object-contain"
              onError={() => {
                onPick(null);
                onError(t("errors.logoType"));
              }}
            />
          </span>
        ) : (
          <MonogramTile name={name || "?"} className="h-16 w-16 rounded-[20px] text-[24px]" />
        )}
        <input
          ref={input}
          id="company-logo"
          type="file"
          accept={LOGO_TYPES.join(",")}
          className="sr-only"
          onChange={choose}
          data-testid="company-logo-input"
        />
        <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>
          <ImageUp className="h-4 w-4" />
          {file ? t("logoChange") : t("logoChoose")}
        </Button>
        {file ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-rose-600 hover:text-rose-700"
            onClick={() => {
              onPick(null);
              onError(null);
            }}
            data-testid="company-logo-remove"
          >
            <Trash2 className="h-4 w-4" />
            {t("logoRemove")}
          </Button>
        ) : null}
      </div>
      {error ? <FieldError>{error}</FieldError> : <p className="text-[12px] text-zinc-400">{t("logoHint")}</p>}
    </div>
  );
}

export function RegisterCompanyDialog({ open, onOpenChange, onRegistered }: Props) {
  const t = useTranslations("adminCompanies.form");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const branding = useMemo(() => createCompanyBrandingApi(), []);
  const [form, setForm] = useState<RegisterCompanyForm>(() => ({ ...EMPTY_REGISTER_FORM, gmPassword: generatePassword() }));
  const [errors, setErrors] = useState<Partial<Record<RegisterField, string>>>({});
  const [logo, setLogo] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  function reset() {
    setForm({ ...EMPTY_REGISTER_FORM, gmPassword: generatePassword() });
    setErrors({});
    setLogo(null);
    setLogoError(null);
    setDone(null);
  }

  async function uploadLogo(companyId: string, file: File): Promise<boolean> {
    try {
      await branding.uploadCompanyLogo(companyId, file);
      return true;
    } catch {
      return false;
    }
  }

  async function retryLogo() {
    if (!done?.pendingLogo) return;
    setBusy(true);
    const ok = await uploadLogo(done.companyId, done.pendingLogo);
    setBusy(false);
    if (ok) {
      setDone({ ...done, pendingLogo: null });
      onRegistered();
    } else {
      feedback.error(null, t("logoFailed"));
    }
  }

  function set(key: RegisterField, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function message(key: RegisterField): string | undefined {
    const raw = errors[key];
    if (!raw) return undefined;
    if (raw === "taken") return t(key === "slug" ? "errors.slugTaken" : "errors.emailTaken");
    return t(`errors.${raw.startsWith("password.") ? raw : key}`);
  }

  async function submit() {
    const found = registerCompanyHints(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      const out = await registerCompany(registerCompanyPayload(form));
      const logoUploaded = logo ? await uploadLogo(out.company.id, logo) : true;
      setDone({
        companyId: out.company.id,
        url: `/${out.company.slug}/${out.main_center.slug}`,
        loginPath: `/${locale}/${out.company.slug}/login`,
        email: form.gmEmail.trim().toLowerCase(),
        password: form.gmPassword,
        pendingLogo: logoUploaded ? null : logo,
      });
      feedback.success(t("created", { name: out.company.name_en }));
      onRegistered();
    } catch (err) {
      if (isApiError(err) && err.fieldErrors) {
        const mapped: Partial<Record<RegisterField, string>> = {};
        for (const [field, value] of Object.entries(err.fieldErrors)) {
          const key = REGISTER_SERVER_FIELDS[field];
          if (!key) continue;
          mapped[key] = /already|in use|exists/i.test(String(value)) ? "taken" : key;
        }
        if (Object.keys(mapped).length > 0) {
          setErrors(mapped);
          return;
        }
      }
      feedback.error(err, t("error"));
    } finally {
      setBusy(false);
    }
  }

  const slugPreview = form.slug.trim() || slugify(form.nameEn) || "…";

  return (
    <ActionDialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
        if (!next) reset();
      }}
      icon={Building2}
      tone="indigo"
      size="lg"
      title={done ? t("doneTitle") : t("title")}
      description={done ? t("doneHint") : t("subtitle")}
      testId="companies-register-drawer"
      footer={
        done ? (
          <>
            <Button variant="outline" onClick={reset}>
              {t("another")}
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
            >
              {t("close")}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button type="submit" form="register-company" disabled={busy} data-testid="companies-register-submit">
              {busy ? t("creating") : t("create")}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div className="space-y-4">
          {done.pendingLogo ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-[22px] bg-amber-50 p-4"
              data-testid="company-logo-failed"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="min-w-0 space-y-2">
                <p className="text-[13px] font-medium text-amber-900">{t("logoFailed")}</p>
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void retryLogo()}>
                  <ImageUp className="h-4 w-4" />
                  {t("logoRetry")}
                </Button>
              </div>
            </div>
          ) : null}
          <dl className="grid gap-3 text-[13px] sm:grid-cols-2">
            <div className="rounded-[18px] bg-zinc-50 px-4 py-3">
              <dt className="text-[12px] font-semibold text-zinc-500">{t("doneUrl")}</dt>
              <dd className="mt-0.5 font-mono text-zinc-900">{done.url}</dd>
            </div>
            <div className="rounded-[18px] bg-zinc-50 px-4 py-3">
              <dt className="text-[12px] font-semibold text-zinc-500">{t("doneLogin")}</dt>
              <dd className="mt-0.5 font-mono text-zinc-900" data-testid="company-done-login">
                {done.loginPath}
              </dd>
            </div>
            <div className="rounded-[18px] bg-zinc-50 px-4 py-3">
              <dt className="text-[12px] font-semibold text-zinc-500">{t("fields.gmEmail")}</dt>
              <dd className="mt-0.5 text-zinc-900">{done.email}</dd>
            </div>
            <div className="rounded-[18px] bg-zinc-50 px-4 py-3">
              <dt className="text-[12px] font-semibold text-zinc-500">{t("fields.gmPassword")}</dt>
              <dd className="mt-0.5 font-mono text-zinc-900">{done.password}</dd>
            </div>
          </dl>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void navigator.clipboard.writeText(`${done.email}\n${done.password}`)}
          >
            <Copy className="h-4 w-4" />
            {t("copy")}
          </Button>
        </div>
      ) : (
        <form
          id="register-company"
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <FormSection icon={Building2} tone="indigo" title={t("groups.company")} hint={t("groups.companyHint")}>
            <LogoPicker file={logo} name={form.nameEn} error={logoError} onPick={setLogo} onError={setLogoError} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("fields.nameEn")} htmlFor="company-nameEn">
                <IconInput
                  id="company-nameEn"
                  icon={Building2}
                  value={form.nameEn}
                  aria-invalid={Boolean(errors.nameEn)}
                  autoComplete="organization"
                  required
                  onChange={(e) => set("nameEn", e.target.value)}
                  data-testid="company-field-nameEn"
                />
                <FieldError>{message("nameEn")}</FieldError>
              </Field>
              <Field label={t("fields.nameAr")} htmlFor="company-nameAr">
                <Input
                  id="company-nameAr"
                  dir="rtl"
                  lang="ar"
                  className="h-12"
                  value={form.nameAr}
                  aria-invalid={Boolean(errors.nameAr)}
                  onChange={(e) => set("nameAr", e.target.value)}
                  data-testid="company-field-nameAr"
                />
                <FieldError>{message("nameAr")}</FieldError>
              </Field>
            </div>
            <Field label={t("fields.slug")} htmlFor="company-slug" hint={t("slugHint", { path: `/${slugPreview}/main` })}>
              <Input
                id="company-slug"
                dir="ltr"
                spellCheck={false}
                autoCapitalize="none"
                maxLength={48}
                className="h-12 font-mono"
                value={form.slug}
                placeholder={slugify(form.nameEn)}
                aria-invalid={Boolean(errors.slug)}
                onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                data-testid="company-field-slug"
              />
              <FieldError>{message("slug")}</FieldError>
            </Field>
          </FormSection>

          <FormSection icon={Sparkles} tone="sky" title={t("groups.plan")} hint={t("groups.planHint")}>
            <PlanPicker
              value={form.plan}
              invalid={Boolean(errors.plan)}
              onChange={(plan: CompanyPlan) => set("plan", plan)}
            />
            <FieldError>{message("plan")}</FieldError>
          </FormSection>

          <FormSection icon={MapPinned} tone="emerald" title={t("groups.location")} hint={t("groups.locationHint")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("fields.country")} htmlFor="company-country">
                <IconInput
                  id="company-country"
                  icon={Globe2}
                  value={form.country}
                  maxLength={COUNTRY_MAX}
                  autoComplete="country-name"
                  placeholder={t("placeholders.country")}
                  aria-invalid={Boolean(errors.country)}
                  onChange={(e) => set("country", e.target.value)}
                  data-testid="company-field-country"
                />
                <FieldError>{message("country")}</FieldError>
              </Field>
              <Field label={t("fields.city")} htmlFor="company-city">
                <IconInput
                  id="company-city"
                  icon={MapPin}
                  value={form.city}
                  maxLength={CITY_MAX}
                  autoComplete="address-level2"
                  placeholder={t("placeholders.city")}
                  aria-invalid={Boolean(errors.city)}
                  onChange={(e) => set("city", e.target.value)}
                  data-testid="company-field-city"
                />
                <FieldError>{message("city")}</FieldError>
              </Field>
            </div>
            <Field label={t("fields.address")} htmlFor="company-address">
              <Textarea
                id="company-address"
                value={form.address}
                maxLength={ADDRESS_MAX}
                rows={3}
                autoComplete="street-address"
                placeholder={t("placeholders.address")}
                aria-invalid={Boolean(errors.address)}
                onChange={(e) => set("address", e.target.value)}
                data-testid="company-field-address"
              />
              <FieldError>{message("address")}</FieldError>
            </Field>
          </FormSection>

          <FormSection icon={UserRound} tone="violet" title={t("groups.gm")} hint={t("gmHint")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("fields.gmName")} htmlFor="company-gmName">
                <IconInput
                  id="company-gmName"
                  icon={UserRound}
                  value={form.gmName}
                  autoComplete="off"
                  required
                  aria-invalid={Boolean(errors.gmName)}
                  onChange={(e) => set("gmName", e.target.value)}
                  data-testid="company-field-gmName"
                />
                <FieldError>{message("gmName")}</FieldError>
              </Field>
              <Field label={t("fields.gmEmail")} htmlFor="company-gmEmail">
                <IconInput
                  id="company-gmEmail"
                  icon={Mail}
                  type="email"
                  dir="ltr"
                  value={form.gmEmail}
                  autoComplete="off"
                  required
                  aria-invalid={Boolean(errors.gmEmail)}
                  onChange={(e) => set("gmEmail", e.target.value)}
                  data-testid="company-field-gmEmail"
                />
                <FieldError>{message("gmEmail")}</FieldError>
              </Field>
            </div>
            <Field label={t("fields.gmPassword")} htmlFor="company-gmPassword">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <IconInput
                    id="company-gmPassword"
                    icon={KeyRound}
                    dir="ltr"
                    autoComplete="new-password"
                    className="font-mono"
                    value={form.gmPassword}
                    aria-invalid={Boolean(errors.gmPassword)}
                    onChange={(e) => set("gmPassword", e.target.value)}
                    data-testid="company-field-gmPassword"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="mt-0 h-12 w-12 shrink-0"
                  aria-label={t("regenerate")}
                  onClick={() => set("gmPassword", generatePassword())}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <FieldError>{message("gmPassword")}</FieldError>
            </Field>
          </FormSection>
        </form>
      )}
    </ActionDialog>
  );
}

/** List thumbnail; falls back to the monogram when there is no (servable) logo. */
export function CompanyLogoThumb({ name, slug, hasLogo, logoVersion }: { name: string; slug: string; hasLogo: boolean; logoVersion: string | null }) {
  const [broken, setBroken] = useState(false);
  const src = companyLogoUrl({ slug, logoVersion: hasLogo ? logoVersion : null });
  if (!src || broken) return <MonogramTile name={name} className="h-9 w-9 rounded-[10px] text-[14px]" />;
  return (
    <span className={`${LOGO_TILE} h-9 w-9 rounded-[10px] bg-white p-1`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- versioned same-origin bytes */}
      <img src={src} alt="" className="h-full w-full object-contain" onError={() => setBroken(true)} />
    </span>
  );
}
