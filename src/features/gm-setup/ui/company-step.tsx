"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import type { CompanyProfile, SetupOverview, SetupRepository } from "@/entities/setup";
import { createBranch, updateBranch } from "@/entities/identity";
import { useRefreshViewer } from "@/entities/viewer";
import { useActiveBranch } from "@/features/branch-scope";
import { isApiError } from "@/shared/api/api-error";
import { useMutationFeedback } from "@/shared/ui";
import {
  COUNTRY_CHOICES,
  CURRENCY_CHOICES,
  TIMEZONE_CHOICES,
  branchDraftHints,
  companyHints,
  companySlug,
  draftSlug,
  type BranchDraft,
  type BranchDraftErrors,
  type CompanyFieldErrors,
} from "../model/flow";
import { BranchesGroup } from "./branches-group";
import { ChoiceGrid, GlassField, GlassGroup, GlassInput, StepHero } from "./glass";
import { LogoGroup } from "./logo-group";
import { StepFooter } from "./step-footer";

type Props = {
  overview: SetupOverview;
  repository: SetupRepository;
  onSaved: (next: SetupOverview) => void;
  onBack: (() => void) | null;
};

const SERVER_FIELDS: Record<string, keyof CompanyProfile> = {
  slug: "slug",
  name_en: "nameEn",
  name_ar: "nameAr",
  legal_name: "legalName",
  phone: "phone",
  email: "email",
  website: "website",
  country: "country",
  city: "city",
  address: "address",
  currency: "currency",
  timezone: "timezone",
};

const SELECT_CLASS =
  "h-[46px] w-full cursor-pointer appearance-none bg-transparent text-[14px] text-white outline-none";

function draftsOf(o: SetupOverview): BranchDraft[] {
  return o.branches.map((b) => ({ id: b.id, nameEn: b.nameEn, kind: b.kind, saved: { nameEn: b.nameEn, slug: b.slug } }));
}

export function CompanyStep({ overview, repository, onSaved, onBack }: Props) {
  const t = useTranslations("setup.company");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const refreshViewer = useRefreshViewer();
  const activeBranch = useActiveBranch();
  const [form, setForm] = useState<CompanyProfile>(() => ({
    ...overview.company,
    timezone: overview.company.timezone || TIMEZONE_CHOICES[0],
  }));
  const [drafts, setDrafts] = useState<BranchDraft[]>(() => draftsOf(overview));
  const [errors, setErrors] = useState<CompanyFieldErrors>({});
  const [branchErrors, setBranchErrors] = useState<BranchDraftErrors>({});
  const [busy, setBusy] = useState(false);
  const main = drafts.find((d) => d.kind === "main_center");
  const slug = companySlug(form.nameEn, overview.company);

  const currencyOptions = useMemo(() => {
    const base: string[] = [...CURRENCY_CHOICES];
    const list = base.includes(form.currency) ? base : [form.currency, ...base.slice(0, 3)];
    return list.map((c) => ({ value: c, label: c }));
  }, [form.currency]);

  const timezoneOptions = useMemo(() => {
    const base: string[] = [...TIMEZONE_CHOICES];
    return base.includes(form.timezone) ? base : [form.timezone, ...base];
  }, [form.timezone]);

  const countryOptions = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    const codes: string[] = [...COUNTRY_CHOICES];
    if (form.country && !codes.includes(form.country)) codes.unshift(form.country);
    return codes.map((code) => ({ code, label: names.of(code) ?? code }));
  }, [locale, form.country]);

  function set<K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    if (key === "nameEn" && errors.slug) setErrors((prev) => ({ ...prev, slug: undefined }));
  }

  function message(key: keyof CompanyProfile, raw?: string): string | undefined {
    if (!raw) return undefined;
    if (key === "slug" && raw === "already in use") return t("errors.slugTaken");
    return t(`errors.${key}`);
  }

  /** New main center first: the backend demotes the old one when another is promoted. */
  async function syncBranches(): Promise<void> {
    const mainIndex = drafts.findIndex((d) => d.kind === "main_center");
    const order = drafts.map((_, i) => i).sort((a, b) => Number(b === mainIndex) - Number(a === mainIndex));
    for (const i of order) {
      const d = drafts[i];
      const name = d.nameEn.trim();
      try {
        if (!d.id) {
          const created = await createBranch({ name_en: name, kind: d.kind });
          setDrafts((prev) => prev.map((x, j) => (j === i ? { ...x, id: created.id } : x)));
          continue;
        }
        const current = overview.branches.find((b) => b.id === d.id);
        const patch: { name_en?: string; kind?: BranchDraft["kind"] } = {};
        if (current?.nameEn !== name) patch.name_en = name;
        if (current?.kind !== d.kind) patch.kind = d.kind;
        if (patch.name_en || patch.kind) await updateBranch(d.id, patch);
      } catch (err) {
        if (isApiError(err) && err.fieldErrors?.slug) setBranchErrors({ [i]: "duplicate" });
        throw err;
      }
    }
  }

  async function save() {
    const profile = { ...form, slug };
    const hints = companyHints(profile);
    const branchHints = branchDraftHints(drafts);
    setErrors(hints);
    setBranchErrors(branchHints);
    if (Object.keys(hints).length > 0 || Object.keys(branchHints).length > 0) return;
    setBusy(true);
    try {
      await syncBranches();
      const next = await repository.saveCompany(profile);
      const viewer = await refreshViewer();
      const ws = viewer?.workspace;
      const branch = ws?.branches.find((b) => b.id === activeBranch?.id) ?? ws?.branches[0];
      if (ws && branch) {
        const url = `/${locale}/${ws.company.slug}/${branch.slug}/setup`;
        if (window.location.pathname !== url) window.history.replaceState(null, "", url);
      }
      setDrafts(draftsOf(next));
      onSaved(next);
    } catch (err) {
      if (isApiError(err) && err.fieldErrors) {
        const mapped: CompanyFieldErrors = {};
        for (const [field, value] of Object.entries(err.fieldErrors)) {
          const key = SERVER_FIELDS[field];
          if (key) mapped[key] = value;
        }
        if (Object.keys(mapped).length > 0) {
          setErrors(mapped);
          return;
        }
      }
      feedback.error(err, t("saveError"));
    } finally {
      setBusy(false);
    }
  }

  // The URL follows the English name, so its errors belong to the name field.
  const errorOf = (key: keyof CompanyProfile) =>
    message(key, errors[key]) ?? (key === "nameEn" ? message("slug", errors.slug) : undefined);

  const field = (key: keyof CompanyProfile, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <GlassField id={`setup-${key}`} label={t(`fields.${key}`)} error={errorOf(key)}>
      <GlassInput
        id={`setup-${key}`}
        value={form[key]}
        invalid={Boolean(errorOf(key))}
        placeholder={t(`placeholders.${key}`)}
        onChange={(e) => set(key, e.target.value)}
        data-testid={`setup-field-${key}`}
        {...extra}
      />
    </GlassField>
  );

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <StepHero icon={Building2} tint="company" title={t("title")} subtitle={t("subtitle")} />

      <GlassGroup
        title={t("groups.identity")}
        footer={
          <span data-testid="setup-workspace-path">
            {t("slugHint", { path: `/${slug || "…"}/${(main ? draftSlug(main) : "") || "…"}` })}
          </span>
        }
      >
        {field("nameEn", { autoComplete: "organization", required: true })}
        {field("nameAr", { dir: "rtl", lang: "ar" })}
        {field("legalName")}
      </GlassGroup>

      <LogoGroup slug={overview.company.slug} name={form.nameEn || overview.company.nameEn} />

      <BranchesGroup
        drafts={drafts}
        errors={branchErrors}
        onChange={(next) => {
          setDrafts(next);
          setBranchErrors({});
        }}
      />

      <GlassGroup title={t("groups.location")} footer={t("locationHint")}>
        <GlassField id="setup-country" label={t("fields.country")} error={message("country", errors.country)}>
          <select
            id="setup-country"
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
            className={SELECT_CLASS}
            aria-invalid={Boolean(errors.country) || undefined}
            data-testid="setup-field-country"
          >
            <option value="" disabled>
              {t("placeholders.country")}
            </option>
            {countryOptions.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </GlassField>
        {field("city", { autoComplete: "address-level2", required: true })}
        {field("address", { autoComplete: "street-address", required: true })}
      </GlassGroup>

      <GlassGroup title={t("groups.contact")}>
        {field("email", { type: "email", autoComplete: "email", inputMode: "email" })}
        {field("phone", { type: "tel", autoComplete: "tel", inputMode: "tel", dir: "ltr" })}
        {field("website", { inputMode: "url", spellCheck: false, dir: "ltr" })}
      </GlassGroup>

      <GlassGroup title={t("groups.preferences")} footer={t("preferencesHint")}>
        <GlassField id="setup-currency" label={t("fields.currency")} error={message("currency", errors.currency)}>
          <div className="py-2">
            <ChoiceGrid
              label={t("fields.currency")}
              columns={4}
              value={form.currency}
              options={currencyOptions}
              onChange={(v) => set("currency", v)}
            />
          </div>
        </GlassField>
        <GlassField id="setup-timezone" label={t("fields.timezone")} error={message("timezone", errors.timezone)}>
          <select
            id="setup-timezone"
            value={form.timezone}
            onChange={(e) => set("timezone", e.target.value)}
            className={SELECT_CLASS}
            data-testid="setup-field-timezone"
          >
            {timezoneOptions.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </GlassField>
      </GlassGroup>

      <StepFooter onBack={onBack} primaryLabel={t("save")} onPrimary={() => void save()} busy={busy} />
    </form>
  );
}
