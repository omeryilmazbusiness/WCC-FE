"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, FileSignature, FileText, Loader2, UploadCloud } from "lucide-react";
import type { Document, DocumentRepository } from "@/entities/document";
import { useCan } from "@/entities/viewer";
import { formatDate } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Button, EmptyState, InfoSection, QueryState, useMutationFeedback } from "@/shared/ui";

type Props = { hotelId: string; documents: DocumentRepository; onChanged?: () => void };

const RELATED_TYPE = "hotel";
const KIND = "contract";
const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT = "application/pdf";

function sizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Signed hotel contracts (PDF), versioned in the document store. */
export function ContractPanel({ hotelId, documents, onChanged }: Props) {
  const t = useTranslations("hotels.contract");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const canUpload = useCan("documents.write");
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const files = useApiQuery(() => documents.list(RELATED_TYPE, hotelId), [documents, hotelId], { cacheKey: ["hotel-contracts", hotelId] });
  const rows = (files.data ?? [])
    .filter((d: Document) => d.kind === KIND && d.sizeBytes > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function upload(file: File) {
    if (file.type !== ACCEPT && !file.name.toLowerCase().endsWith(".pdf")) {
      feedback.error(new Error("pdf"), t("onlyPdf"));
      return;
    }
    if (file.size > MAX_BYTES) {
      feedback.error(new Error("size"), t("tooLarge"));
      return;
    }
    setUploading(true);
    try {
      await documents.uploadFile({ relatedType: RELATED_TYPE, relatedId: hotelId, kind: KIND, fileName: file.name, contentType: ACCEPT, file });
      feedback.success(t("uploaded"));
      await files.refresh();
      onChanged?.();
    } catch (e) {
      feedback.error(e, t("uploadError"));
    } finally {
      setUploading(false);
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
    <InfoSection
      icon={FileSignature}
      tone="indigo"
      title={t("title")}
      badge={rows.length ? <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">{rows.length}</span> : null}
      action={
        canUpload ? (
          <>
            <input
              ref={input}
              type="file"
              accept={`${ACCEPT},.pdf`}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
              }}
              data-testid="contract-file"
            />
            <Button size="sm" disabled={uploading} onClick={() => input.current?.click()} data-testid="contract-upload">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UploadCloud className="h-4 w-4" aria-hidden />}
              {uploading ? t("uploading") : t("upload")}
            </Button>
          </>
        ) : null
      }
      data-testid="hotel-contract"
    >
      <QueryState loading={files.loading && !files.data} error={files.error} onRetry={() => void files.reload()}>
        {rows.length === 0 ? (
          <EmptyState icon={FileText} title={t("empty")} description={t("emptyHint")} />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {rows.map((doc, i) => (
              <li key={doc.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600" aria-hidden>
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-zinc-900">
                    <bdi>{doc.fileName}</bdi>
                  </p>
                  <p className="text-[12px] text-zinc-500">
                    {i === 0 ? <span className="me-1.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-700">{t("current")}</span> : null}
                    {formatDate(doc.createdAt, locale)} · {sizeLabel(doc.sizeBytes)}
                  </p>
                </div>
                <Button size="sm" variant="outline" disabled={opening === doc.id} onClick={() => void open(doc)}>
                  {opening === doc.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
                  {t("open")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </InfoSection>
  );
}
