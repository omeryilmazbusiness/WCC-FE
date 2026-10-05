"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  BadgePercent,
  Building2,
  CalendarRange,
  Globe,
  Hash,
  KeyRound,
  Lock,
  Mail,
  Phone,
  PlugZap,
  Power,
  Siren,
  Timer,
  Trash2,
  Undo2,
  UserRound,
  Wallet,
  Webhook,
} from "lucide-react";
import {
  CATEGORY_LOOK,
  CREDENTIAL_KEYS,
  ENVIRONMENT_LOOK,
  INTEGRATION_LOOK,
  INTEGRATION_TYPES,
  PAYMENT_LOOK,
  PAYMENT_MODELS,
  PAYMENT_TERMS,
  PRODUCTS,
  PRODUCT_LOOK,
  REGIONS,
  SUPPLIER_CATEGORIES,
  SUPPLIER_CURRENCIES,
  type CredentialKey,
  type Supplier,
  type SupplierDetail,
  type SupplierRepository,
} from "@/entities/supplier";
import { isApiError } from "@/shared/api/api-error";
import { cn } from "@/shared/lib/cn";
import {
  ActionDialog,
  Button,
  ChipSet,
  ChoiceGrid,
  Field,
  FormSection,
  IconInput,
  Input,
  MoneyInput,
  SegmentedControl,
  SwitchRow,
  Textarea,
  TONES,
  useMutationFeedback,
} from "@/shared/ui";
import {
  SERVER_FIELD,
  balanceLocked,
  draftErrors,
  draftFromSupplier,
  draftToInput,
  newDraft,
  normalizeCode,
  type SupplierDraft,
  type SupplierDraftField,
} from "../model/draft";

type Props = {
  repository: SupplierRepository;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit mode when set. */
  supplier?: Supplier | null;
  credentials?: SupplierDetail["credentials"];
  onSaved: (supplier: Supplier) => void;
};

function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="text-[12px] font-medium text-rose-600">{children}</p>;
}

/** Create / edit a supplier: identity, account manager, integration & credentials, account, markups and scope. */
export function SupplierFormDialog({ repository, open, onOpenChange, supplier, credentials = {}, onSaved }: Props) {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const [draft, setDraft] = useState<SupplierDraft>(newDraft);
  const [touched, setTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<SupplierDraftField, string>>>({});
  const [saving, setSaving] = useState(false);
  const locked = balanceLocked(supplier);

  useEffect(() => {
    if (!open) return;
    setDraft(supplier ? draftFromSupplier(supplier) : newDraft());
    setTouched(false);
    setServerErrors({});
  }, [open, supplier]);

  const errors = useMemo(() => draftErrors(draft), [draft]);
  const invalid = Object.keys(errors).length > 0;
  const set = <K extends keyof SupplierDraft>(key: K, value: SupplierDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setServerErrors((s) => {
      const next = { ...s };
      delete next[key as SupplierDraftField];
      return next;
    });
  };
  const err = (f: SupplierDraftField) => serverErrors[f] ?? (touched && errors[f] ? t(`form.errors.${errors[f]}`) : undefined);
  const setCredential = (k: CredentialKey, v: string) =>
    setDraft((d) => ({ ...d, credentials: { ...d.credentials, [k]: v }, clearCredentials: { ...d.clearCredentials, [k]: false } }));
  const toggleClear = (k: CredentialKey) =>
    setDraft((d) => ({ ...d, credentials: { ...d.credentials, [k]: "" }, clearCredentials: { ...d.clearCredentials, [k]: !d.clearCredentials[k] } }));

  async function submit() {
    setTouched(true);
    if (invalid) return;
    setSaving(true);
    try {
      const input = draftToInput(draft);
      const saved = supplier ? await repository.update(supplier.id, input) : await repository.create(input);
      feedback.success(supplier ? t("form.updated") : t("form.created"));
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      if (isApiError(e) && e.fieldErrors) {
        const mapped: Partial<Record<SupplierDraftField, string>> = {};
        for (const [k, v] of Object.entries(e.fieldErrors)) if (SERVER_FIELD[k]) mapped[SERVER_FIELD[k]] = v;
        setServerErrors(mapped);
      }
      feedback.error(e, t("form.saveError"));
    } finally {
      setSaving(false);
    }
  }

  const connected = draft.integrationType !== "manual";
  const currency = draft.currency;

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Building2}
      tone="indigo"
      size="xl"
      title={supplier ? t("form.editTitle") : t("form.createTitle")}
      description={t("form.subtitle")}
      testId="supplier-form-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={saving || (touched && invalid)} onClick={() => void submit()} data-testid="supplier-form-submit">
            {saving ? t("saving") : supplier ? tc("save") : t("form.create")}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pb-2">
        <FormSection icon={Building2} tone="indigo" title={t("form.identity.title")} hint={t("form.identity.hint")}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("form.identity.code")} htmlFor="supplier-code" hint={supplier ? t("form.identity.codeLocked") : t("form.identity.codeHint")}>
              <IconInput
                id="supplier-code"
                icon={Hash}
                dir="ltr"
                className="font-mono uppercase"
                value={draft.code}
                disabled={Boolean(supplier)}
                onChange={(e) => set("code", normalizeCode(e.target.value))}
                placeholder="SUP-DUFFEL-01"
                data-testid="supplier-code"
              />
              <FieldError>{err("code")}</FieldError>
            </Field>
            <Field label={t("form.identity.nameEn")} htmlFor="supplier-name">
              <IconInput id="supplier-name" icon={Building2} value={draft.nameEn} onChange={(e) => set("nameEn", e.target.value)} maxLength={160} placeholder="Duffel Financial Ltd" data-testid="supplier-name" />
              <FieldError>{err("nameEn")}</FieldError>
            </Field>
            <Field label={t("form.identity.nameAr")} htmlFor="supplier-name-ar">
              <Input id="supplier-name-ar" dir="rtl" className="h-12" value={draft.nameAr} onChange={(e) => set("nameAr", e.target.value)} maxLength={160} />
            </Field>
          </div>
          <div>
            <p className="mb-2 text-[12.5px] font-semibold text-zinc-600">{t("form.identity.category")}</p>
            <ChoiceGrid
              name="supplier-category"
              columns={4}
              value={draft.category}
              onChange={(v) => set("category", v)}
              options={SUPPLIER_CATEGORIES.map((c) => ({ value: c, label: t(`category.${c}.label`), hint: t(`category.${c}.hint`), ...CATEGORY_LOOK[c] }))}
            />
          </div>
          <SwitchRow icon={Power} tone="emerald" label={t("form.identity.active")} hint={t("form.identity.activeHint")} checked={draft.isActive} onChange={(v) => set("isActive", v)} testId="supplier-active" />
        </FormSection>

        <FormSection icon={UserRound} tone="violet" title={t("form.contact.title")} hint={t("form.contact.hint")}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("form.contact.name")} htmlFor="supplier-am-name">
              <IconInput id="supplier-am-name" icon={UserRound} value={draft.contactName} onChange={(e) => set("contactName", e.target.value)} maxLength={160} />
            </Field>
            <Field label={t("form.contact.email")} htmlFor="supplier-am-email">
              <IconInput id="supplier-am-email" icon={Mail} dir="ltr" type="email" value={draft.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
              <FieldError>{err("contactEmail")}</FieldError>
            </Field>
            <Field label={t("form.contact.phone")} htmlFor="supplier-am-phone">
              <IconInput id="supplier-am-phone" icon={Phone} dir="ltr" type="tel" value={draft.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="+966 …" />
              <FieldError>{err("contactPhone")}</FieldError>
            </Field>
          </div>
          <div className="rounded-[20px] bg-gradient-to-br from-rose-50 via-white to-white p-3 ring-1 ring-inset ring-rose-100">
            <Field label={t("form.contact.emergency")} htmlFor="supplier-emergency" hint={t("form.contact.emergencyHint")}>
              <IconInput id="supplier-emergency" icon={Siren} iconClassName="text-rose-500" dir="ltr" type="tel" value={draft.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} placeholder="+966 …" data-testid="supplier-emergency" />
              <FieldError>{err("emergencyPhone")}</FieldError>
            </Field>
          </div>
        </FormSection>

        <FormSection icon={PlugZap} tone="sky" title={t("form.integration.title")} hint={t("form.integration.hint")}>
          <ChoiceGrid
            name="supplier-integration"
            columns={3}
            value={draft.integrationType}
            onChange={(v) => set("integrationType", v)}
            options={INTEGRATION_TYPES.map((i) => ({ value: i, label: t(`integration.${i}.label`), hint: t(`integration.${i}.hint`), ...INTEGRATION_LOOK[i] }))}
          />
          {connected ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[12.5px] font-semibold text-zinc-600">{t("form.integration.environment")}</p>
                <SegmentedControl
                  aria-label={t("form.integration.environment")}
                  value={draft.environment}
                  onChange={(v) => set("environment", v)}
                  options={(["sandbox", "production"] as const).map((env) => ({ value: env, label: t(`environment.${env}`), icon: ENVIRONMENT_LOOK[env].icon }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("form.integration.baseUrl")} htmlFor="supplier-base-url">
                  <IconInput id="supplier-base-url" icon={Globe} dir="ltr" value={draft.apiBaseUrl} onChange={(e) => set("apiBaseUrl", e.target.value)} placeholder="https://api.example.com" data-testid="supplier-base-url" />
                  <FieldError>{err("apiBaseUrl")}</FieldError>
                </Field>
                <Field label={t("form.integration.webhook")} htmlFor="supplier-webhook">
                  <IconInput id="supplier-webhook" icon={Webhook} dir="ltr" value={draft.webhookUrl} onChange={(e) => set("webhookUrl", e.target.value)} placeholder="https://…/hooks/supplier" />
                  <FieldError>{err("webhookUrl")}</FieldError>
                </Field>
              </div>
              <div className="rounded-[22px] border border-zinc-200/70 bg-zinc-50/70 p-3.5">
                <p className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-800">
                  <Lock className="h-4 w-4 text-emerald-600" aria-hidden />
                  {t("form.integration.credentials")}
                </p>
                <p className="mb-3 text-[12px] text-zinc-500">{t("form.integration.credentialsHint")}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CREDENTIAL_KEYS.map((k) => {
                    const stored = credentials[k];
                    const clearing = draft.clearCredentials[k];
                    return (
                      <Field key={k} label={t(`credential.${k}`)} htmlFor={`supplier-cred-${k}`}>
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <IconInput
                              id={`supplier-cred-${k}`}
                              icon={KeyRound}
                              dir="ltr"
                              type="password"
                              autoComplete="new-password"
                              className={cn("font-mono", clearing && "line-through opacity-60")}
                              value={draft.credentials[k]}
                              disabled={clearing}
                              onChange={(e) => setCredential(k, e.target.value)}
                              placeholder={stored ? t("form.integration.keep", { hint: stored }) : t("form.integration.notSet")}
                              data-testid={`supplier-cred-${k}`}
                            />
                          </div>
                          {stored ? (
                            <button
                              type="button"
                              onClick={() => toggleClear(k)}
                              className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition", clearing ? TONES.zinc.soft : "bg-rose-50 text-rose-600 hover:bg-rose-100")}
                              aria-label={clearing ? t("form.integration.undoClear") : t("form.integration.clear")}
                              title={clearing ? t("form.integration.undoClear") : t("form.integration.clear")}
                            >
                              {clearing ? <Undo2 className="h-4 w-4" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
                            </button>
                          ) : null}
                        </div>
                      </Field>
                    );
                  })}
                </div>
                <FieldError>{err("credentials")}</FieldError>
              </div>
            </>
          ) : null}
        </FormSection>

        <FormSection icon={Wallet} tone="emerald" title={t("form.finance.title")} hint={t("form.finance.hint")}>
          <ChoiceGrid
            name="supplier-payment"
            columns={3}
            value={draft.paymentModel}
            onChange={(v) => (locked ? undefined : set("paymentModel", v))}
            options={PAYMENT_MODELS.map((m) => ({ value: m, label: t(`payment.${m}.label`), hint: t(`payment.${m}.hint`), ...PAYMENT_LOOK[m] }))}
          />
          {locked ? <p className="rounded-2xl bg-amber-50 px-3 py-2 text-[12.5px] font-medium text-amber-800">{t("form.finance.locked")}</p> : null}
          <FieldError>{err("paymentModel")}</FieldError>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-zinc-600">{t("form.finance.currency")}</p>
              <SegmentedControl
                aria-label={t("form.finance.currency")}
                value={draft.currency}
                onChange={(v) => (locked ? undefined : set("currency", v))}
                options={SUPPLIER_CURRENCIES.map((c) => ({ value: c, label: c }))}
              />
              <FieldError>{err("currency")}</FieldError>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {draft.paymentModel === "postpaid" ? (
              <Field label={t("form.finance.creditLimit")} htmlFor="supplier-credit" hint={t("form.finance.creditLimitHint")}>
                <MoneyInput id="supplier-credit" currency={currency} value={draft.creditLimit} onChange={(v) => set("creditLimit", v)} data-testid="supplier-credit-limit" />
                <FieldError>{err("creditLimit")}</FieldError>
              </Field>
            ) : null}
            {draft.paymentModel !== "card" ? (
              <Field label={t("form.finance.threshold")} htmlFor="supplier-threshold" hint={t("form.finance.thresholdHint")}>
                <MoneyInput id="supplier-threshold" currency={currency} value={draft.lowBalanceThreshold} onChange={(v) => set("lowBalanceThreshold", v)} data-testid="supplier-threshold" />
                <FieldError>{err("lowBalanceThreshold")}</FieldError>
              </Field>
            ) : null}
          </div>
          <div>
            <p className="mb-2 text-[12.5px] font-semibold text-zinc-600">{t("form.finance.terms")}</p>
            <SegmentedControl
              aria-label={t("form.finance.terms")}
              className="flex-wrap"
              value={draft.paymentTerms}
              onChange={(v) => set("paymentTerms", v)}
              options={PAYMENT_TERMS.map((p) => ({ value: p, label: t(`terms.${p}`) }))}
            />
          </div>
        </FormSection>

        <FormSection icon={BadgePercent} tone="amber" title={t("form.markups.title")} hint={t("form.markups.hint")}>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {PRODUCTS.map((p) => {
              const look = PRODUCT_LOOK[p];
              const Icon = look.icon;
              return (
                <label key={p} className={cn("flex items-center gap-2.5 rounded-[18px] bg-gradient-to-br p-2.5 ring-1 ring-inset ring-zinc-900/[0.05]", TONES[look.tone].tint)}>
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]", TONES[look.tone].solid)} aria-hidden>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-zinc-700">{t(`product.${p}`)}</span>
                    <span className="relative mt-1 block">
                      <Input
                        inputMode="decimal"
                        value={draft.markups[p]}
                        onChange={(e) => set("markups", { ...draft.markups, [p]: e.target.value.replace(/[^\d.,]/g, "") })}
                        className="h-9 pe-8 text-[14px] font-semibold tabular-nums"
                        placeholder="0"
                        aria-label={t(`product.${p}`)}
                        data-testid={`supplier-markup-${p}`}
                      />
                      <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-zinc-400">%</span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <FieldError>{err("markups")}</FieldError>
        </FormSection>

        <FormSection icon={Globe} tone="teal" title={t("form.scope.title")} hint={t("form.scope.hint")}>
          <div>
            <p className="mb-2 text-[12.5px] font-semibold text-zinc-600">{t("form.scope.regions")}</p>
            <ChipSet name="supplier-region" tone="teal" values={draft.regions} onChange={(v) => set("regions", REGIONS.filter((r) => v.includes(r)))} options={REGIONS.map((r) => ({ value: r, label: t(`region.${r}`) }))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("form.scope.freeCancel")} htmlFor="supplier-free-cancel" hint={t("form.scope.freeCancelHint")}>
              <div className="relative">
                <IconInput id="supplier-free-cancel" icon={Timer} inputMode="numeric" value={draft.freeCancelHours} onChange={(e) => set("freeCancelHours", e.target.value.replace(/\D/g, "").slice(0, 4))} className="pe-12 tabular-nums" data-testid="supplier-free-cancel" />
                <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-zinc-400">{t("hoursShort")}</span>
              </div>
              <FieldError>{err("freeCancelHours")}</FieldError>
            </Field>
            <Field label={t("form.scope.contractStart")} htmlFor="supplier-contract-start">
              <IconInput id="supplier-contract-start" icon={CalendarRange} type="date" value={draft.contractStart} onChange={(e) => set("contractStart", e.target.value)} />
              <FieldError>{err("contractStart")}</FieldError>
            </Field>
            <Field label={t("form.scope.contractEnd")} htmlFor="supplier-contract-end" hint={t("form.scope.contractEndHint")}>
              <IconInput id="supplier-contract-end" icon={CalendarRange} type="date" value={draft.contractEnd} onChange={(e) => set("contractEnd", e.target.value)} data-testid="supplier-contract-end" />
              <FieldError>{err("contractEnd")}</FieldError>
            </Field>
          </div>
          <Field label={t("form.scope.terms")} htmlFor="supplier-terms">
            <Textarea id="supplier-terms" value={draft.terms} onChange={(e) => set("terms", e.target.value)} maxLength={4000} rows={3} placeholder={t("form.scope.termsPlaceholder")} />
          </Field>
        </FormSection>
      </div>
    </ActionDialog>
  );
}
