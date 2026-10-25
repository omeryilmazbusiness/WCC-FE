"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Building2, CalendarRange } from "lucide-react";
import {
  getCompany,
  saveCompany,
  updateCompanyPlan,
  type PlatformCompany,
} from "@/entities/company";
import { ofCompanyPlan, type CompanyPlan } from "@/entities/company/plan";
import { PlanPicker } from "@/features/register-company/ui/plan-picker";
import { formatDate } from "@/shared/lib/format";
import {
  Badge,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Field,
  Input,
  useMutationFeedback,
} from "@/shared/ui";

type Props = {
  company: PlatformCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

type Draft = {
  nameEn: string;
  nameAr: string;
  slug: string;
  country: string;
  city: string;
  address: string;
  plan: CompanyPlan;
};

function draftOf(c: PlatformCompany): Draft {
  return {
    nameEn: c.name_en,
    nameAr: c.name_ar ?? "",
    slug: c.slug,
    country: c.country ?? "",
    city: c.city ?? "",
    address: c.address ?? "",
    plan: ofCompanyPlan(c.plan).plan,
  };
}

export function EditCompanyDrawer({ company, open, onOpenChange, onSaved }: Props) {
  const t = useTranslations("adminCompanies.edit");
  const tp = useTranslations("adminCompanies.plans");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const [row, setRow] = useState<PlatformCompany | null>(company);
  const [form, setForm] = useState<Draft | null>(company ? draftOf(company) : null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !company) {
      setRow(company);
      setForm(company ? draftOf(company) : null);
      return;
    }
    setRow(company);
    setForm(draftOf(company));
    void getCompany(company.id)
      .then((next) => {
        setRow(next);
        setForm(draftOf(next));
      })
      .catch(() => undefined);
  }, [open, company]);

  const term = row?.term;

  async function submit() {
    if (!row || !form) return;
    const profileChanged =
      form.nameEn.trim() !== (row.name_en ?? "") ||
      form.nameAr.trim() !== (row.name_ar ?? "") ||
      form.slug.trim() !== (row.slug ?? "") ||
      form.country.trim() !== (row.country ?? "") ||
      form.city.trim() !== (row.city ?? "") ||
      form.address.trim() !== (row.address ?? "");
    const nextPlan = form.plan;
    const planChanged = nextPlan !== ofCompanyPlan(row.plan).plan;
    if (!profileChanged && !planChanged) return;
    setBusy(true);
    try {
      let next = row;
      if (profileChanged) {
        next = await saveCompany(row.id, {
          name_en: form.nameEn.trim(),
          name_ar: form.nameAr.trim() || undefined,
          slug: form.slug.trim() || undefined,
          country: form.country.trim() || undefined,
          city: form.city.trim() || undefined,
          address: form.address.trim() || undefined,
        });
      }
      if (planChanged) {
        next = await updateCompanyPlan(row.id, nextPlan);
      }
      setRow(next);
      setForm(draftOf(next));
      feedback.success(planChanged && !profileChanged ? t("renewed") : t("saved"));
      onSaved();
    } catch (err) {
      feedback.error(err, t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function renew() {
    if (!row) return;
    setBusy(true);
    try {
      const next = await updateCompanyPlan(row.id, ofCompanyPlan(row.plan).plan);
      setRow(next);
      setForm(draftOf(next));
      feedback.success(t("renewed"));
      onSaved();
    } catch (err) {
      feedback.error(err, t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-2xl" data-testid="company-edit-drawer">
        <DrawerHeader>
          <DrawerTitle>{row?.name_en ?? t("title")}</DrawerTitle>
          <DrawerDescription>{t("subtitle")}</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-6">
          {term ? (
            <section
              className="rounded-[22px] bg-zinc-50 p-4"
              data-testid="company-plan-term"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
                  <CalendarRange className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold text-zinc-950">{tp(`${term.plan}.name`)}</p>
                    <TermBadge status={term.status} label={t(`status.${term.status}`)} />
                  </div>
                  <p className="mt-1 text-[12.5px] text-zinc-500">{t("fixedYear")}</p>
                  <dl className="mt-3 grid gap-2 text-[12.5px] sm:grid-cols-2">
                    <div>
                      <dt className="text-zinc-400">{t("started")}</dt>
                      <dd className="font-medium text-zinc-800">{formatDate(term.startedAt, locale)}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-400">{t("ends")}</dt>
                      <dd className="font-medium text-zinc-800">{formatDate(term.endsAt, locale)}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-zinc-400">{t("remaining")}</dt>
                      <dd className="font-medium text-zinc-800">
                        {term.status === "expired" ? t("expiredHint") : t("daysLeft", { n: term.daysLeft })}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>
          ) : null}

          {form ? (
            <form
              id="edit-company"
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <Field label={t("fields.nameEn")} htmlFor="edit-company-name">
                <Input
                  id="edit-company-name"
                  value={form.nameEn}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                  data-testid="edit-company-name"
                />
              </Field>
              <Field label={t("fields.nameAr")} htmlFor="edit-company-name-ar">
                <Input
                  id="edit-company-name-ar"
                  dir="rtl"
                  lang="ar"
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                />
              </Field>
              <Field label={t("fields.slug")} htmlFor="edit-company-slug">
                <Input
                  id="edit-company-slug"
                  className="font-mono"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("fields.country")} htmlFor="edit-company-country">
                  <Input
                    id="edit-company-country"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                  />
                </Field>
                <Field label={t("fields.city")} htmlFor="edit-company-city">
                  <Input
                    id="edit-company-city"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </Field>
              </div>
              <Field label={t("fields.address")} htmlFor="edit-company-address">
                <Input
                  id="edit-company-address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </Field>
              <div>
                <p className="mb-2 text-[12.5px] font-semibold text-zinc-600">{t("fields.plan")}</p>
                <PlanPicker
                  value={form.plan}
                  onChange={(plan) => setForm({ ...form, plan })}
                />
                <p className="mt-2 text-[12px] text-zinc-400">{t("planHint")}</p>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-2 text-zinc-400">
              <Building2 className="h-4 w-4" />
              {t("loading")}
            </div>
          )}
        </DrawerBody>
        <DrawerFooter>
          <Button variant="outline" onClick={() => void renew()} disabled={busy || !row} data-testid="company-renew-plan">
            {t("renew")}
          </Button>
          <Button type="submit" form="edit-company" disabled={busy || !form} data-testid="company-edit-save">
            {busy ? t("saving") : t("save")}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function TermBadge({ status, label }: { status: string; label: string }) {
  const tone =
    status === "expired"
      ? "bg-rose-50 text-rose-700"
      : status === "expiring"
        ? "bg-amber-50 text-amber-800"
        : "bg-emerald-50 text-emerald-700";
  return <Badge className={tone}>{label}</Badge>;
}
