"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, FileWarning } from "lucide-react";
import {
  createDocumentRepository,
  type DocumentRepository,
  type MissingDocsRow,
} from "@/entities/document";
import { Link } from "@/shared/i18n/navigation";
import { routes } from "@/shared/config/routes";
import {
  Button,
  EmptyState,
  Input,
  Screen,
  useToast,
} from "@/shared/ui";

type Props = { repository?: DocumentRepository };

function downloadCsv(rows: MissingDocsRow[], filename: string) {
  const lines = [
    "booking_id,participant_id,customer_id,missing_kinds",
    ...rows.map(
      (r) =>
        `${r.bookingId},${r.participantId ?? ""},${r.customerId},"${r.missingKinds.join(";")}"`,
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function MissingDocsBoard({ repository }: Props) {
  const repo = useMemo(
    () => repository ?? createDocumentRepository(),
    [repository],
  );
  const t = useTranslations("ops");
  const { push } = useToast();
  const search = useSearchParams();
  const qDep = search.get("departure_id") ?? search.get("departureId") ?? "";

  const [departureId, setDepartureId] = useState(qDep);
  const [rows, setRows] = useState<MissingDocsRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (id: string) => {
      if (!id.trim()) {
        setRows([]);
        return;
      }
      setBusy(true);
      try {
        setRows(await repo.missingDocs(id.trim()));
      } catch {
        push({ title: t("loadError"), tone: "error" });
      } finally {
        setBusy(false);
      }
    },
    [repo, push, t],
  );

  useEffect(() => {
    if (qDep) void load(qDep);
  }, [qDep, load]);

  return (
    <Screen data-testid="missing-docs-board" className="!space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            {t("missingDocsTitle")}
          </h1>
          <p className="text-[13px] text-zinc-500">{t("missingDocsSubtitle")}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={rows.length === 0}
          onClick={() =>
            downloadCsv(rows, `missing-docs-${departureId.slice(0, 8)}.csv`)
          }
        >
          <Download className="me-1.5 h-3.5 w-3.5" />
          {t("exportCsv")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_28px_-14px_rgba(15,23,42,0.22)]">
        <div className="flex flex-wrap items-end gap-2 border-b border-zinc-100 bg-zinc-50/80 p-3">
          <div className="min-w-[240px] flex-1 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              {t("departureId")}
            </p>
            <Input
              className="h-9 font-mono text-[12px]"
              placeholder={t("departureIdPh")}
              value={departureId}
              onChange={(e) => setDepartureId(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            disabled={busy || !departureId.trim()}
            onClick={() => void load(departureId)}
          >
            {t("load")}
          </Button>
        </div>

        <div className="p-4">
          {rows.length === 0 ? (
            <EmptyState
              title={t("missingDocsEmpty")}
              description={t("missingDocsEmptyHint")}
            />
          ) : (
            <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
              {rows.map((r, i) => (
                <li
                  key={`${r.bookingId}-${r.participantId ?? i}`}
                  className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm"
                >
                  <FileWarning className="h-4 w-4 shrink-0 text-amber-600" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900">
                      <Link
                        href={routes.booking(r.bookingId)}
                        className="hover:underline"
                      >
                        {r.bookingId.slice(0, 8)}
                      </Link>
                      {r.participantId ? (
                        <span className="ms-2 text-[11px] font-normal text-zinc-400">
                          pax {r.participantId.slice(0, 8)}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[12px] text-zinc-500">
                      {r.missingKinds.join(", ") || "—"}
                    </p>
                  </div>
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                    {r.missingKinds.length} {t("missing")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Screen>
  );
}
