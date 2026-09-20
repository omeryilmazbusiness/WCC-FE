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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@/shared/ui";

const RELATIONS = ["spouse", "child", "parent", "sibling", "relative", "friend", "other"] as const;

type Props = {
  customerId: string;
  repository: CustomerRepository;
  onLinked?: () => void;
};

export function LinkCompanionDialog({ customerId, repository, onLinked }: Props) {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Customer[]>([]);
  const [companionId, setCompanionId] = useState<string | null>(null);
  const [relation, setRelation] = useState<string>("spouse");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      void repository.search(query).then((rows) => {
        setCandidates(rows.filter((c) => c.id !== customerId && c.isActive !== false));
      });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [open, query, repository, customerId]);

  async function confirm() {
    if (!companionId) return;
    setBusy(true);
    try {
      await repository.linkCompanion(customerId, companionId, relation, notes);
      onLinked?.();
      setOpen(false);
      setCompanionId(null);
      setQuery("");
      setNotes("");
      setRelation("spouse");
    } catch {
      push({ title: t("companionError"), tone: "error" });
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
          setCompanionId(null);
          setQuery("");
          setNotes("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">{t("linkCompanion")}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("linkCompanionTitle")}</DialogTitle>
          <DialogDescription>{t("linkCompanionHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("mergeSearch")}
          />
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-zinc-200/80 p-2">
            {candidates.length === 0 ? (
              <li className="px-2 py-3 text-sm text-zinc-500">{t("mergeEmpty")}</li>
            ) : (
              candidates.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setCompanionId(c.id)}
                    className={`flex w-full flex-col rounded-xl px-3 py-2 text-start text-sm transition-colors ${
                      companionId === c.id
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
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("relation")}
            </p>
            <Select value={relation} onValueChange={setRelation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`relations.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("companionNotes")}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              disabled={!companionId || busy}
              onClick={() => void confirm()}
            >
              {t("linkCompanion")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
