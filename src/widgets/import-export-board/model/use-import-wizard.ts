"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  IMPORTABLE_ENTITY_TYPES,
  MAX_UPLOAD_MB,
  cleanMapping,
  fileIssue,
  resumeStep,
  type FieldDef,
  type ImportEntityType,
  type ImportExportRepository,
  type ImportJob,
  type ImportMode,
} from "@/entities/importexport";
import { useMutationFeedback, useToast } from "@/shared/ui";

export type WizardStep = "upload" | "match" | "review" | "done";
export type WizardBusy = "upload" | "review" | "confirm" | null;

type Options = {
  repo: ImportExportRepository;
  schemas: Record<string, FieldDef[]>;
  /** Called after anything that changes the job list (upload, confirm). */
  onJobsChanged: () => void;
};

/** Upload → match columns → review → done. Owns the job being imported and its draft mapping. */
export function useImportWizard({ repo, schemas, onJobsChanged }: Options) {
  const t = useTranslations("importExport");
  const feedback = useMutationFeedback();
  const { push } = useToast();
  const [step, setStep] = useState<WizardStep>("upload");
  const [entity, setEntity] = useState<ImportEntityType>(IMPORTABLE_ENTITY_TYPES[0]);
  const [mode, setMode] = useState<ImportMode>("upsert");
  const [job, setJob] = useState<ImportJob | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<WizardBusy>(null);

  const activeEntity = job?.entityType ?? entity;
  const fields = useMemo(() => schemas[activeEntity] ?? [], [schemas, activeEntity]);

  const upload = useCallback(
    async (file: File) => {
      const issue = fileIssue(file.name, file.size);
      if (issue) {
        push({ title: t(`fileIssue.${issue}`, { max: MAX_UPLOAD_MB }), tone: "error" });
        return;
      }
      setBusy("upload");
      try {
        const uploaded = await repo.upload(file, entity, mode);
        setJob(uploaded);
        setMapping({ ...uploaded.mapping });
        setStep("match");
        onJobsChanged();
      } catch (err) {
        feedback.error(err, t("uploadError"));
      } finally {
        setBusy(null);
      }
    },
    [entity, feedback, mode, onJobsChanged, push, repo, t],
  );

  const resume = useCallback((draft: ImportJob) => {
    const target = resumeStep(draft);
    if (!target) return;
    setJob(draft);
    setEntity(draft.entityType);
    setMode(draft.mode);
    setMapping({ ...draft.mapping });
    setStep(target);
  }, []);

  const setField = useCallback((key: string, header: string) => {
    setMapping((m) => {
      const next = { ...m };
      if (header) next[key] = header;
      else delete next[key];
      return next;
    });
  }, []);

  const review = useCallback(async () => {
    if (!job) return;
    setBusy("review");
    try {
      await repo.setMapping(job.id, cleanMapping(fields, mapping, job.headers), mode);
      setJob(await repo.validate(job.id));
      setStep("review");
    } catch (err) {
      feedback.error(err, t("saveError"));
    } finally {
      setBusy(null);
    }
  }, [feedback, fields, job, mapping, mode, repo, t]);

  const confirm = useCallback(async () => {
    if (!job) return;
    setBusy("confirm");
    try {
      setJob(await repo.confirm(job.id));
      setStep("done");
      onJobsChanged();
    } catch (err) {
      feedback.error(err, t("saveError"));
    } finally {
      setBusy(null);
    }
  }, [feedback, job, onJobsChanged, repo, t]);

  const backToMatch = useCallback(() => setStep("match"), []);

  const reset = useCallback(() => {
    setJob(null);
    setMapping({});
    setStep("upload");
  }, []);

  return {
    step,
    entity,
    mode,
    job,
    fields,
    mapping,
    busy,
    setEntity,
    setMode,
    setMapping,
    setField,
    upload,
    resume,
    review,
    confirm,
    backToMatch,
    reset,
  };
}

export type ImportWizard = ReturnType<typeof useImportWizard>;
