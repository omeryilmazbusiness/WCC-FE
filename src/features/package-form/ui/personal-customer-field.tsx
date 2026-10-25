"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { UserRound, X } from "lucide-react";
import { createCustomerRepository, type Customer } from "@/entities/customer";
import { useCan } from "@/entities/viewer";
import { CustomerFormDialog } from "@/features/customer-form";
import { initials } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/cn";
import { FormField, FormItem, FormMessage, SearchField, TONES } from "@/shared/ui";
import type { PackageFormValues } from "../model/form";

const customers = createCustomerRepository();

function labelOf(c: Pick<Customer, "fullName" | "fullNameAr" | "phone">, locale: string): string {
  const name = locale === "ar" && c.fullNameAr ? c.fullNameAr : c.fullName || c.fullNameAr;
  return [name, c.phone].filter(Boolean).join(" · ");
}

/** Search (or create) the one customer this personal package belongs to. */
export function PersonalCustomerField() {
  const t = useTranslations("packages.form");
  const locale = useLocale();
  const canWrite = useCan("customers.write");
  const { control, setValue, watch } = useFormContext<PackageFormValues>();
  const customerId = watch("customerId");
  const customerName = watch("customerName");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Customer[]>([]);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const api = useMemo(() => customers, []);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setHits([]);
      return;
    }
    let live = true;
    setBusy(true);
    api
      .search(query)
      .then((rows) => live && setHits(rows.slice(0, 8)))
      .catch(() => live && setHits([]))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [api, q]);

  function pick(c: Customer) {
    setValue("customerId", c.id, { shouldDirty: true, shouldValidate: true });
    setValue("customerName", labelOf(c, locale), { shouldDirty: true });
    setQ("");
    setHits([]);
  }

  function clear() {
    setValue("customerId", "", { shouldDirty: true, shouldValidate: true });
    setValue("customerName", "", { shouldDirty: true });
  }

  return (
    <FormField
      control={control}
      name="customerId"
      render={() => (
        <FormItem data-testid="package-form-customer">
          {customerId ? (
            <div className="flex items-center gap-3 rounded-[22px] bg-violet-50/80 px-3 py-2.5 ring-1 ring-inset ring-violet-200/70">
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-semibold", TONES.violet.soft)} aria-hidden>
                {initials(customerName)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-zinc-950">{customerName}</span>
              <button
                type="button"
                onClick={clear}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-white hover:text-zinc-900"
                aria-label={t("identity.clearCustomer")}
                data-testid="package-form-customer-clear"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <SearchField
                value={q}
                onValueChange={setQ}
                placeholder={t("identity.customerPh")}
                data-testid="package-form-customer-search"
              />
              {busy ? <p className="text-[12px] text-zinc-400">{t("identity.customerSearching")}</p> : null}
              {hits.length > 0 ? (
                <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl ring-1 ring-zinc-200/70">
                  {hits.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => pick(c)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-start hover:bg-zinc-50"
                        data-testid={`package-form-customer-${c.id}`}
                      >
                        <span className={cn("flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold", TONES.violet.soft)} aria-hidden>
                          {initials(c.fullName)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-semibold text-zinc-950">{labelOf(c, locale)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {canWrite ? (
                <>
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-2xl px-3 text-[13px] font-semibold text-violet-700 hover:bg-violet-50"
                    data-testid="package-form-customer-create"
                  >
                    <UserRound className="h-4 w-4" aria-hidden />
                    {t("identity.createCustomer")}
                  </button>
                  <CustomerFormDialog
                    repository={api}
                    open={creating}
                    onOpenChange={setCreating}
                    onSaved={(res) => pick(res.customer)}
                  />
                </>
              ) : null}
            </div>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
