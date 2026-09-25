"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createDocumentRepository,
  DOCUMENT_KINDS,
  type DocChecklistItem,
  type Document,
  type DocumentRepository,
} from "@/entities/document";
import {
  createVisaRepository,
  VISA_NEXT,
  type VisaCase,
  type VisaRepository,
  type VisaStatus,
} from "@/entities/visa";
import type { BookingParticipant } from "@/entities/booking";
import { OCRConfirmPanel } from "@/features/ai-ocr";
import { cn } from "@/shared/lib/cn";
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@/shared/ui";

type Props = {
  bookingId: string;
  participants?: BookingParticipant[];
  section?: "documents" | "visa" | "all";
  documentRepo?: DocumentRepository;
  visaRepo?: VisaRepository;
  onChanged?: () => void;
};

function statusTone(status: string) {
  switch (status) {
    case "approved":
    case "issued":
      return "bg-emerald-50 text-emerald-800";
    case "submitted":
    case "processing":
    case "uploaded":
      return "bg-sky-50 text-sky-800";
    case "rejected":
    case "expired":
    case "cancelled":
      return "bg-rose-50 text-rose-800";
    case "missing":
    case "pending":
      return "bg-amber-50 text-amber-900";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

export function BookingOpsPanel({
  bookingId,
  participants = [],
  section = "all",
  documentRepo,
  visaRepo,
  onChanged,
}: Props) {
  const docsRepo = useMemo(
    () => documentRepo ?? createDocumentRepository(),
    [documentRepo],
  );
  const vRepo = useMemo(() => visaRepo ?? createVisaRepository(), [visaRepo]);
  const t = useTranslations("ops");
  const { push } = useToast();

  const [items, setItems] = useState<DocChecklistItem[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [cases, setCases] = useState<VisaCase[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadKind, setUploadKind] = useState("passport");
  const [uploadPax, setUploadPax] = useState<string>("");
  const [rejectNote, setRejectNote] = useState("");
  const [visaNote, setVisaNote] = useState("");
  const [visaPax, setVisaPax] = useState("");
  const [visaRef, setVisaRef] = useState("");

  const refresh = useCallback(async () => {
    const tasks: Promise<void>[] = [];
    if (section === "documents" || section === "all") {
      tasks.push(
        (async () => {
          const [cl, list] = await Promise.all([
            docsRepo.checklist(bookingId),
            docsRepo.list("booking", bookingId),
          ]);
          const enriched = cl.items.map((it) => {
            if (it.documentId) {
              const d = list.find((x) => x.id === it.documentId);
              if (d) return { ...it, status: d.status };
            }
            if (!it.participantName && it.participantId) {
              const p = participants.find((x) => x.id === it.participantId);
              if (p) return { ...it, participantName: p.fullName };
            }
            return it;
          });
          setItems(enriched);
          setDocs(list);
        })(),
      );
    }
    if (section === "visa" || section === "all") {
      tasks.push(
        (async () => {
          setCases(await vRepo.listByBooking(bookingId));
        })(),
      );
    }
    await Promise.all(tasks);
  }, [bookingId, docsRepo, vRepo, participants, section]);

  useEffect(() => {
    void refresh().catch(() => push({ title: t("loadError"), tone: "error" }));
  }, [refresh, push, t]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await refresh();
      onChanged?.();
      push({ title: t("saved"), tone: "success" });
    } catch (e) {
      push({
        title: t("actionError"),
        description: e instanceof Error ? e.message : undefined,
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; items: DocChecklistItem[] }>();
    for (const it of items) {
      const key = it.participantId || "__booking__";
      const name =
        it.participantName ||
        participants.find((p) => p.id === it.participantId)?.fullName ||
        (key === "__booking__" ? t("bookingLevel") : it.participantId || "—");
      const g = map.get(key) ?? { name, items: [] };
      g.items.push(it);
      map.set(key, g);
    }
    if (map.size === 0 && docs.length > 0) {
      map.set("__booking__", { name: t("bookingLevel"), items: [] });
    }
    return [...map.entries()];
  }, [items, docs, participants, t]);

  const showDocs = section === "documents" || section === "all";
  const showVisa = section === "visa" || section === "all";

  return (
    <div className="space-y-4" data-testid="booking-ops-panel">
      {showDocs ? (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_28px_-14px_rgba(15,23,42,0.22)]">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-950">{t("docsTitle")}</p>
            <span className="text-[11px] font-medium text-zinc-400">
              {items.length} · {docs.length} {t("files")}
            </span>
          </div>
          <div className="space-y-3 p-4">
            {groups.length === 0 ? (
              <p className="text-sm text-zinc-500">{t("docsEmpty")}</p>
            ) : (
              groups.map(([key, g]) => (
                <div key={key} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    {g.name}
                  </p>
                  <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
                    {g.items.map((it, idx) => (
                      <li
                        key={`${it.kind}-${it.documentId ?? idx}`}
                        className="flex flex-wrap items-center gap-2 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-900">
                            {it.label}
                            {it.required ? (
                              <span className="ms-1 text-[10px] text-amber-700">
                                *
                              </span>
                            ) : null}
                          </p>
                          <p className="text-[11px] text-zinc-400">{it.kind}</p>
                        </div>
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                            statusTone(it.status),
                          )}
                        >
                          {t(`docStatus.${it.status}` as "docStatus.missing")}
                        </span>
                        {it.documentId ? (
                          <div className="flex flex-wrap gap-1">
                            <Select
                              value={it.kind}
                              onValueChange={(kind) =>
                                void run(() =>
                                  docsRepo.classify(it.documentId!, kind),
                                )
                              }
                              disabled={busy}
                            >
                              <SelectTrigger className="h-8 w-[110px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DOCUMENT_KINDS.map((k) => (
                                  <SelectItem key={k} value={k}>
                                    {t(`docKind.${k}` as "docKind.passport")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {(it.status === "uploaded" ||
                              it.status === "pending") && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() =>
                                  void run(() => docsRepo.submit(it.documentId!))
                                }
                              >
                                {t("submit")}
                              </Button>
                            )}
                            {it.status === "submitted" ||
                            it.status === "uploaded" ? (
                              <>
                                <Button
                                  size="sm"
                                  disabled={busy}
                                  onClick={() =>
                                    void run(() =>
                                      docsRepo.approve(it.documentId!),
                                    )
                                  }
                                >
                                  {t("approve")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() =>
                                    void run(() =>
                                      docsRepo.reject(
                                        it.documentId!,
                                        rejectNote || t("rejectDefault"),
                                      ),
                                    )
                                  }
                                >
                                  {t("reject")}
                                </Button>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}

            {docs.length > 0 ? (
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  {t("uploadedFiles")}
                </p>
                <ul className="space-y-1">
                  {docs.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {d.fileName || d.id.slice(0, 8)}
                      </span>
                      <Badge className={statusTone(d.status)}>{d.status}</Badge>
                      {(d.status === "uploaded" || d.status === "pending") && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void run(() => docsRepo.submit(d.id))}
                        >
                          {t("submit")}
                        </Button>
                      )}
                      {(d.status === "submitted" || d.status === "uploaded") && (
                        <>
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => void run(() => docsRepo.approve(d.id))}
                          >
                            {t("approve")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              void run(() =>
                                docsRepo.reject(
                                  d.id,
                                  rejectNote || t("rejectDefault"),
                                ),
                              )
                            }
                          >
                            {t("reject")}
                          </Button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-zinc-200 p-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-zinc-500">{t("kind")}</p>
                <Select value={uploadKind} onValueChange={setUploadKind}>
                  <SelectTrigger className="h-8 w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`docKind.${k}` as "docKind.passport")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {participants.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-zinc-500">
                    {t("participant")}
                  </p>
                  <Select
                    value={uploadPax || "__none__"}
                    onValueChange={(v) => setUploadPax(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("bookingLevel")}</SelectItem>
                      {participants.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-zinc-500">
                  {t("rejectNote")}
                </p>
                <Input
                  className="h-8 w-[140px]"
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder={t("rejectNotePh")}
                />
              </div>
              <label className="inline-flex h-8 cursor-pointer items-center rounded-md bg-sky-600 px-3 text-[13px] font-semibold text-white hover:bg-sky-700">
                {t("upload")}
                <input
                  type="file"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    void run(() =>
                      docsRepo.uploadFile({
                        relatedType: "booking",
                        relatedId: bookingId,
                        kind: uploadKind,
                        fileName: file.name,
                        contentType: file.type || "application/octet-stream",
                        participantId: uploadPax || null,
                        file,
                      }),
                    );
                  }}
                />
              </label>
            </div>
            <OCRConfirmPanel
              onConfirmFields={(fields) => {
                push({
                  title: t("ocrConfirmed", {
                    name: fields.full_name || fields.passport_no || "OK",
                  }),
                  tone: "success",
                });
              }}
            />
          </div>
        </div>
      ) : null}

      {showVisa ? (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_28px_-14px_rgba(15,23,42,0.22)]">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-950">{t("visaTitle")}</p>
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  vRepo.create({
                    bookingId,
                    participantId: visaPax || null,
                    externalRef: visaRef,
                    notes: visaNote,
                  }),
                )
              }
            >
              {t("visaCreate")}
            </Button>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap gap-2">
              {participants.length > 0 ? (
                <Select
                  value={visaPax || "__none__"}
                  onValueChange={(v) => setVisaPax(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger className="h-8 w-[140px]">
                    <SelectValue placeholder={t("participant")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("bookingLevel")}</SelectItem>
                    {participants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Input
                className="h-8 max-w-[140px]"
                placeholder={t("externalRef")}
                value={visaRef}
                onChange={(e) => setVisaRef(e.target.value)}
              />
              <Input
                className="h-8 max-w-[160px]"
                placeholder={t("visaNotePh")}
                value={visaNote}
                onChange={(e) => setVisaNote(e.target.value)}
              />
            </div>

            {cases.length === 0 ? (
              <p className="text-sm text-zinc-500">{t("visaEmpty")}</p>
            ) : (
              <ul className="space-y-2">
                {cases.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl border border-zinc-100 px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900">
                        {c.id.slice(0, 8)}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                          statusTone(c.status),
                        )}
                      >
                        {t(`visaStatus.${c.status}` as "visaStatus.draft")}
                      </span>
                      {c.externalRef ? (
                        <span className="text-[11px] text-zinc-400">
                          {c.externalRef}
                        </span>
                      ) : null}
                      {c.participantId ? (
                        <span className="text-[11px] text-zinc-500">
                          {participants.find((p) => p.id === c.participantId)
                            ?.fullName ?? c.participantId.slice(0, 8)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(VISA_NEXT[c.status] ?? []).map((next: VisaStatus) => (
                        <Button
                          key={next}
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              vRepo.transition(c.id, next, visaNote),
                            )
                          }
                        >
                          → {t(`visaStatus.${next}` as "visaStatus.draft")}
                        </Button>
                      ))}
                    </div>
                    {c.events && c.events.length > 0 ? (
                      <ol className="mt-2 space-y-0.5 border-t border-zinc-50 pt-2 text-[11px] text-zinc-500">
                        {c.events.map((ev) => (
                          <li key={ev.id}>
                            {ev.fromStatus} → {ev.toStatus}
                            {ev.note ? ` · ${ev.note}` : ""}
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
