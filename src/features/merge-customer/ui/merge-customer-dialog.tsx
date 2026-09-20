"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Customer, CustomerRepository } from "@/entities/customer";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  useToast,
} from "@/shared/ui";

type Props = {
  target: Customer;
  repository: CustomerRepository;
  onMerged?: (customer: Customer) => void;
};

export function MergeCustomerDialog({ target, repository, onMerged }: Props) {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Customer[]>([]);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      void repository.search(query).then((rows) => {
        setCandidates(rows.filter((c) => c.id !== target.id && c.isActive !== false));
      });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [open, query, repository, target.id]);

  async function confirm() {
    if (!sourceId) return;
    setBusy(true);
    try {
      const merged = await repository.merge(target.id, sourceId);
      onMerged?.(merged);
      setOpen(false);
      setSourceId(null);
      setQuery("");
    } catch {
      push({ title: t("mergeError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setSourceId(null);
          setQuery("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          {t("merge")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("mergeTitle")}</DialogTitle>
          <DialogDescription>
            {t("mergeHint", { name: target.fullName })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("mergeSearch")}
          />
          <ul className="max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-zinc-200/80 p-2">
            {candidates.length === 0 ? (
              <li className="px-2 py-3 text-sm text-zinc-500">{t("mergeEmpty")}</li>
            ) : (
              candidates.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSourceId(c.id)}
                    className={`flex w-full flex-col rounded-xl px-3 py-2 text-start text-sm transition-colors ${
                      sourceId === c.id
                        ? "bg-zinc-950 text-white"
                        : "hover:bg-zinc-100"
                    }`}
                  >
                    <span className="font-semibold">{c.fullName}</span>
                    <span className="opacity-70">{c.phone}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
          <p className="text-xs text-zinc-500">{t("mergeWarn")}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              disabled={!sourceId || busy}
              onClick={() => void confirm()}
            >
              {t("mergeConfirm")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
