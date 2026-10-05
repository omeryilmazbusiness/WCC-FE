"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Building, Check, Download, FileLock2, FileSignature, FileText, Handshake, Loader2, UploadCloud, type LucideIcon } from "lucide-react";
import type { Document, DocumentRepository } from "@/entities/document";
import { useCan } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import { formatDate } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Button, EmptyState, InfoSection, QueryState, TONES, useMutationFeedback, type Tone } from "@/shared/ui";

export const SUPPLIER_DOC_KINDS = ["contract", "nda", "sla", "corporate"] as const;
export type SupplierDocKind = (typeof SUPPLIER_DOC_KINDS)[number];

const LOOK: Record<SupplierDocKind, { icon: LucideIcon; tone: Tone }> = {
  contract: { icon: FileSignature, tone: "indigo" },
  nda: { icon: FileLock2, tone: "violet" },
  sla: { icon: Handshake, tone: "teal" },
  corporate: { icon: Building, tone: "amber" },
};

const RELATED_TYPE = "supplier";
const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT = "application/pdf";

function sizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

type Props = { supplierId: string; documents: DocumentRepository };

/** NDA, SLA, corporate papers and the signed contract (PDF), versioned per kind. */
export function SupplierDocumentsPanel({ supplierId, documents }: Props) {
  const t = useTranslations("suppliers.documents");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const canUpload = useCan("documents.write");
  const input = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<SupplierDocKind>("contract");
  const [uploading, setUploading] = useState<SupplierDocKind | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const files = useApiQuery(() => documents.list(RELATED_TYPE, supplierId), [documents, supplierId], { cacheKey: ["supplier-docs", supplierId] });
  const rows = (files.data ?? [])
    .filter((d: Document) => (SUPPLIER_DOC_KINDS as readonly string[]).includes(d.kind) && d.sizeBytes > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latest = new Map<string, Document>();
  for (const d of rows) if (!latest.has(d.kind)) latest.set(d.kind, d);

  function pick(kind: SupplierDocKind) {
    setTarget(kind);
    input.current?.click();
  }

  async function upload(file: File, kind: SupplierDocKind) {
    if (file.type !== ACCEPT && !file.name.toLowerCase().endsWith(".pdf")) {
      feedback.error(new Error("pdf"), t("onlyPdf"));
      return;
    }
    if (file.size > MAX_BYTES) {
      feedback.error(new Error("size"), t("tooLarge"));
      return;
    }
    setUploading(kind);
    try {
      await documents.uploadFile({ relatedType: RELATED_TYPE, relatedId: supplierId, kind, fileName: file.name, contentType: ACCEPT, file });
      feedback.success(t("uploaded"));
      await files.refresh();
    } catch (e) {
      feedback.error(e, t("uploadError"));
    } finally {
      setUploading(null);
      if (input.current) input.current.value = "";
    }
  }

  async function open(doc: Document) {
    setOpening(doc.id);
    try {
      const url = await documents.downloadUrl(doc.id);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      feedback.error(e, t("openError"));
    } finally {
      setOpening(null);
    }
  }

  return (
    <InfoSection icon={FileText} tone="indigo" title={t("title")} data-testid="supplier-documents">
      <input
        ref={input}
        type="file"
        accept={`${ACCEPT},.pdf`}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f, target);
        }}
        data-testid="supplier-doc-file"
      />
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {SUPPLIER_DOC_KINDS.map((kind) => {
          const look = LOOK[kind];
          const Icon = look.icon;
          const doc = latest.get(kind);
          const busy = uploading === kind;
          return (
            <div key={kind} className={cn("flex flex-col gap-2.5 rounded-[22px] bg-gradient-to-br p-3.5 ring-1 ring-inset ring-zinc-900/[0.05]", TONES[look.tone].tint)} data-testid={`supplier-doc-${kind}`}>
              <div className="flex items-center gap-2.5">
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px]", TONES[look.tone].gradient)} aria-hidden>
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-zinc-900">{t(`kind.${kind}`)}</p>
                  {doc ? (
                    <p className="flex items-center gap-1 text-[11.5px] font-semibold text-emerald-700">
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                      {t("onFile")}
                    </p>
                  ) : (
                    <p className="text-[11.5px] font-medium text-zinc-400">{t("missing")}</p>
                  )}
                </div>
              </div>
              {canUpload ? (
                <Button size="sm" variant="outline" disabled={Boolean(uploading)} onClick={() => pick(kind)} data-testid={`supplier-doc-upload-${kind}`}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UploadCloud className="h-4 w-4" aria-hidden />}
                  {busy ? t("uploading") : doc ? t("replace") : t("upload")}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      <QueryState loading={files.loading && !files.data} error={files.error} onRetry={() => void files.reload()}>
        {rows.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={FileText} title={t("empty")} description={t("emptyHint")} />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {rows.map((doc) => {
              const kind = doc.kind as SupplierDocKind;
              const current = latest.get(kind)?.id === doc.id;
              return (
                <li key={doc.id} className="flex items-center gap-3 py-3 last:pb-0">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600" aria-hidden>
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-zinc-900">
                      <bdi>{doc.fileName}</bdi>
                    </p>
                    <p className="text-[12px] text-zinc-500">
                      <span className={cn("me-1.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold", TONES[LOOK[kind].tone].soft)}>{t(`kind.${kind}`)}</span>
                      {current ? <span className="me-1.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-700">{t("current")}</span> : null}
                      {formatDate(doc.createdAt, locale)} · {sizeLabel(doc.sizeBytes)}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" disabled={opening === doc.id} onClick={() => void open(doc)}>
                    {opening === doc.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
                    {t("open")}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
    </InfoSection>
  );
}
