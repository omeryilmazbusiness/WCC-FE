"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createAIRepository } from "@/entities/ai";
import { Button, useToast } from "@/shared/ui";

type Props = {
  onConfirmFields?: (fields: Record<string, string>) => void;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const i = dataUrl.indexOf(",");
      resolve(i >= 0 ? dataUrl.slice(i + 1) : dataUrl);
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * OCR extract → human confirm-before-save (T-195 / T-201).
 */
export function OCRConfirmPanel({ onConfirmFields }: Props) {
  const t = useTranslations("aiOcr");
  const { push } = useToast();
  const repo = useMemo(() => createAIRepository(), []);
  const [fields, setFields] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const b64 = await fileToBase64(file);
      const out = await repo.ocrExtract({
        imageBase64: b64,
        mime: file.type || "image/jpeg",
        hint: "passport or travel document",
      });
      setFields(out.fields ?? {});
      push({ title: t("extracted"), tone: "success" });
    } catch {
      push({ title: t("error"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-semibold text-zinc-950">{t("title")}</p>
      <p className="text-xs font-medium text-zinc-500">{t("hint")}</p>
      <input
        type="file"
        accept="image/*"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          e.target.value = "";
          void onFile(f);
        }}
        className="block w-full text-xs text-zinc-600"
      />
      {fields ? (
        <div className="space-y-2">
          {Object.entries(fields).map(([k, v]) => (
            <label key={k} className="block text-xs font-semibold text-zinc-500">
              {k}
              <input
                className="mt-1 h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-950"
                value={v}
                onChange={(e) =>
                  setFields((prev) => ({ ...prev!, [k]: e.target.value }))
                }
              />
            </label>
          ))}
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onConfirmFields?.(fields);
              push({ title: t("confirmed"), tone: "success" });
            }}
          >
            {t("confirm")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
