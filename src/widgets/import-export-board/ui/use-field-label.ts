"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import type { FieldDef } from "@/entities/importexport";

/** Localised field name, falling back to the API's English label for unknown keys. */
export function useFieldLabel() {
  const t = useTranslations("importExport.fields");
  return useCallback((f: Pick<FieldDef, "key" | "label">) => (t.has(f.key) ? t(f.key) : f.label), [t]);
}
