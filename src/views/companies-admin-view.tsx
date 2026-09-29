"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Copy, Plus, RefreshCw } from "lucide-react";
import {
  COMPANY_LIST_LIMIT,
  listCompanies,
  registerCompany,
  type PlatformCompany,
} from "@/entities/company";
import { generatePassword, passwordIssue, slugify } from "@/features/gm-setup";
import { isApiError } from "@/shared/api/api-error";
import { formatDateTime } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import {
  Badge,
  Button,
  DataTable,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
  Label,
  ListScreen,
  QueryState,
  SearchFilterBar,
  useMutationFeedback,
} from "@/shared/ui";

type Form = {
  nameEn: string;
  nameAr: string;
  slug: string;
  country: string;
  city: string;
  gmName: string;
  gmEmail: string;
  gmPassword: string;
};

type FieldKey = keyof Form;

const EMPTY: Omit<Form, "gmPassword"> = {
  nameEn: "",
  nameAr: "",
  slug: "",
  country: "",
  city: "",
  gmName: "",
  gmEmail: "",
};

/** Backend detail keys → form fields. */
const SERVER_FIELDS: Record<string, FieldKey> = {
  name_en: "nameEn",
  name_ar: "nameAr",
  slug: "slug",
  country: "country",
  city: "city",
  gm_full_name: "gmName",
  gm_email: "gmEmail",
  email: "gmEmail",
  gm_password: "gmPassword",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hints(f: Form): Partial<Record<FieldKey, string>> {
  const out: Partial<Record<FieldKey, string>> = {};
  const name = f.nameEn.trim();
  if (name.length < 2 || name.length > 120) out.nameEn = "nameEn";
  const slug = f.slug.trim() || slugify(name);
  if (!/^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])$/.test(slug)) out.slug = "slug";
  if (f.country.trim() && !/^[A-Za-z]{2}$/.test(f.country.trim())) out.country = "country";
  if (f.gmName.trim().length < 2) out.gmName = "gmName";
  if (!EMAIL.test(f.gmEmail.trim())) out.gmEmail = "gmEmail";
  const pw = passwordIssue(f.gmPassword);
  if (pw) out.gmPassword = `password.${pw}`;
  return out;
}

export function CompaniesAdminView() {
  const t = useTranslations("adminCompanies");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const q = useDebouncedValue(query.trim(), 250);

  const companies = useApiQuery(() => listCompanies({ q: q || undefined }), [q]);
  const rows = useMemo(() => companies.data ?? [], [companies.data]);

  const columns = useMemo<ColumnDef<PlatformCompany>[]>(
    () => [
      {
        header: t("columns.company"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-zinc-950">{row.original.name_en}</p>
            <p className="truncate font-mono text-[11px] text-zinc-500">/{row.original.slug}</p>
          </div>
        ),
      },
      {
        header: t("columns.gm"),
        cell: ({ row }) => <span className="text-zinc-700">{row.original.gm_email || "—"}</span>,
      },
      {
        header: t("columns.location"),
        cell: ({ row }) => (
          <span className="text-zinc-600">
            {[row.original.city, row.original.country].filter(Boolean).join(", ") || "—"}
          </span>
        ),
      },
      {
        header: t("columns.branches"),
        cell: ({ row }) => <span className="tabular-nums">{row.original.branch_count}</span>,
      },
      {
        header: t("columns.users"),
        cell: ({ row }) => <span className="tabular-nums">{row.original.user_count}</span>,
      },
      {
        header: t("columns.status"),
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge className="bg-emerald-50 text-emerald-700">{t("active")}</Badge>
          ) : (
            <Badge className="bg-rose-50 text-rose-700">{t("suspended")}</Badge>
          ),
      },
      {
        header: t("columns.created"),
        cell: ({ row }) => (
          <span className="text-zinc-500">{formatDateTime(new Date(row.original.created_at), locale)}</span>
        ),
      },
    ],
    [t, locale],
  );

  return (
    <ListScreen
      title={t("title")}
      description={t("subtitle")}
      actions={
        <Button size="sm" onClick={() => setOpen(true)} data-testid="companies-register">
          <Plus className="h-4 w-4" />
          {t("register")}
        </Button>
      }
      toolbar={
        <SearchFilterBar
          value={query}
          onValueChange={setQuery}
          placeholder={t("search")}
          clearLabel={tc("clearSearch")}
          filterLabel={tc("filter")}
          resetLabel={tc("resetFilters")}
          isFiltered={query.length > 0}
          onReset={() => setQuery("")}
          sections={[]}
        />
      }
    >
      <QueryState
        loading={companies.loading && !companies.data}
        error={companies.error}
        onRetry={() => void companies.reload()}
        empty={rows.length === 0}
        emptyTitle={t("empty")}
      >
        <DataTable columns={columns} data={rows} />
        {rows.length >= COMPANY_LIST_LIMIT ? (
          <p className="mt-3 text-[12px] text-zinc-500">{t("limitHint", { count: COMPANY_LIST_LIMIT })}</p>
        ) : null}
      </QueryState>

      <RegisterDrawer open={open} onOpenChange={setOpen} onRegistered={() => void companies.reload()} />
    </ListScreen>
  );
}

function RegisterDrawer({
  open,
  onOpenChange,
  onRegistered,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered: () => void;
}) {
  const t = useTranslations("adminCompanies.form");
  const feedback = useMutationFeedback();
  const [form, setForm] = useState<Form>(() => ({ ...EMPTY, gmPassword: generatePassword() }));
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ url: string; email: string; password: string } | null>(null);

  function reset() {
    setForm({ ...EMPTY, gmPassword: generatePassword() });
    setErrors({});
    setDone(null);
  }

  function set(key: FieldKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function message(key: FieldKey): string | undefined {
    const raw = errors[key];
    if (!raw) return undefined;
    if (raw === "taken") return t(key === "slug" ? "errors.slugTaken" : "errors.emailTaken");
    return t(`errors.${raw.startsWith("password.") ? raw : key}`);
  }

  async function submit() {
    const found = hints(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      const out = await registerCompany({
        name_en: form.nameEn.trim(),
        name_ar: form.nameAr.trim() || undefined,
        slug: form.slug.trim() || undefined,
        country: form.country.trim().toUpperCase() || undefined,
        city: form.city.trim() || undefined,
        gm: { full_name: form.gmName.trim(), email: form.gmEmail.trim(), password: form.gmPassword },
      });
      setDone({
        url: `/${out.company.slug}/${out.main_center.slug}`,
        email: form.gmEmail.trim().toLowerCase(),
        password: form.gmPassword,
      });
      feedback.success(t("created", { name: out.company.name_en }));
      onRegistered();
    } catch (err) {
      if (isApiError(err) && err.fieldErrors) {
        const mapped: Partial<Record<FieldKey, string>> = {};
        for (const [field, value] of Object.entries(err.fieldErrors)) {
          const key = SERVER_FIELDS[field];
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

  const field = (key: FieldKey, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`company-${key}`}>{t(`fields.${key}`)}</Label>
      <Input
        id={`company-${key}`}
        value={form[key]}
        aria-invalid={Boolean(errors[key])}
        onChange={(e) => set(key, e.target.value)}
        data-testid={`company-field-${key}`}
        {...extra}
      />
      {message(key) ? <p className="text-[12px] font-medium text-rose-600">{message(key)}</p> : null}
    </div>
  );

  const slugPreview = form.slug.trim() || slugify(form.nameEn) || "…";

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DrawerContent data-testid="companies-register-drawer">
        <DrawerHeader>
          <DrawerTitle>{t("title")}</DrawerTitle>
          <DrawerDescription>{t("subtitle")}</DrawerDescription>
        </DrawerHeader>

        {done ? (
          <DrawerBody className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4">
              <Building2 className="h-5 w-5 text-emerald-600" />
              <p className="text-[14px] font-semibold text-emerald-900">{t("doneTitle")}</p>
            </div>
            <dl className="space-y-3 text-[13px]">
              <div>
                <dt className="text-zinc-500">{t("doneUrl")}</dt>
                <dd className="font-mono text-zinc-900">{done.url}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("fields.gmEmail")}</dt>
                <dd className="text-zinc-900">{done.email}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("fields.gmPassword")}</dt>
                <dd className="font-mono text-zinc-900">{done.password}</dd>
              </div>
            </dl>
            <p className="text-[12px] text-zinc-500">{t("doneHint")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void navigator.clipboard.writeText(`${done.email}\n${done.password}`)}
            >
              <Copy className="h-4 w-4" />
              {t("copy")}
            </Button>
          </DrawerBody>
        ) : (
          <DrawerBody>
            <form
              id="register-company"
              className="space-y-6"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <section className="space-y-3">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
                  {t("groups.company")}
                </h3>
                {field("nameEn", { autoComplete: "organization", required: true })}
                {field("nameAr", { dir: "rtl", lang: "ar" })}
                {field("slug", {
                  dir: "ltr",
                  spellCheck: false,
                  autoCapitalize: "none",
                  maxLength: 48,
                  placeholder: slugify(form.nameEn),
                  onChange: (e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")),
                })}
                <p className="text-[12px] text-zinc-500">
                  {t("slugHint", { path: `/${slugPreview}/main` })}
                </p>
                <div className="grid grid-cols-[96px_1fr] gap-3">
                  {field("country", { maxLength: 2, placeholder: "SA", dir: "ltr" })}
                  {field("city")}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
                  {t("groups.gm")}
                </h3>
                {field("gmName", { autoComplete: "off", required: true })}
                {field("gmEmail", { type: "email", autoComplete: "off", dir: "ltr", required: true })}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    {field("gmPassword", { dir: "ltr", autoComplete: "new-password", className: "font-mono" })}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="mb-[2px] shrink-0"
                    aria-label={t("regenerate")}
                    onClick={() => set("gmPassword", generatePassword())}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[12px] text-zinc-500">{t("gmHint")}</p>
              </section>
            </form>
          </DrawerBody>
        )}

        <DrawerFooter>
          {done ? (
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
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
