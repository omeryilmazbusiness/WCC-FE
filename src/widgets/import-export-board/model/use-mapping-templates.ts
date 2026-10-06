"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import type { ImportEntityType, ImportExportRepository } from "@/entities/importexport";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { useMutationFeedback, useToast } from "@/shared/ui";

/** Saved column mappings for one entity: list, save the current one, delete. */
export function useMappingTemplates(repo: ImportExportRepository, entity: ImportEntityType) {
  const t = useTranslations("importExport");
  const feedback = useMutationFeedback();
  const { push } = useToast();
  const [saving, setSaving] = useState(false);
  const query = useApiQuery(() => repo.listTemplates(entity), [repo, entity], {
    cacheKey: ["import-templates", entity],
  });
  const { reload } = query;

  const save = useCallback(
    async (name: string, mapping: Record<string, string>) => {
      setSaving(true);
      try {
        await repo.saveTemplate(name.trim(), entity, mapping);
        push({ title: t("templates.saved"), tone: "success" });
        await reload();
        return true;
      } catch (err) {
        feedback.error(err, t("templates.saveError"));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [entity, feedback, push, reload, repo, t],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await repo.deleteTemplate(id);
        push({ title: t("templates.deleted"), tone: "success" });
        await reload();
      } catch (err) {
        feedback.error(err, t("templates.deleteError"));
      }
    },
    [feedback, push, reload, repo, t],
  );

  return { templates: query.data ?? [], loading: query.loading, saving, save, remove };
}
