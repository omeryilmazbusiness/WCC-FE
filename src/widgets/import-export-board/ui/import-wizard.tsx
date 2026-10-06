"use client";

import { useTranslations } from "next-intl";
import { SECTION_LOOK, type ImportExportRepository } from "@/entities/importexport";
import { useErrorReport } from "../model/use-error-report";
import type { ImportWizard as Wizard } from "../model/use-import-wizard";
import { MappingStep } from "./mapping-step";
import { Panel } from "./panel";
import { ResultStep } from "./result-step";
import { ReviewStep } from "./review-step";
import { UploadStep } from "./upload-step";
import { WizardStepper } from "./wizard-stepper";

type Props = { repo: ImportExportRepository; wizard: Wizard };

/** Import section: stepper plus whichever step the wizard is on. */
export function ImportWizard({ repo, wizard }: Props) {
  const t = useTranslations("importExport");
  const errors = useErrorReport(repo);
  const { step, job } = wizard;

  return (
    <Panel look={SECTION_LOOK.import} title={t("importTitle")} description={t("importSubtitle")} data-testid="ie-import">
      <div className="mb-6">
        <WizardStepper step={step} />
      </div>
      {step === "upload" || !job ? (
        <UploadStep
          entity={wizard.entity}
          mode={wizard.mode}
          fields={wizard.fields}
          uploading={wizard.busy === "upload"}
          onEntity={wizard.setEntity}
          onMode={wizard.setMode}
          onFile={(file) => void wizard.upload(file)}
        />
      ) : step === "match" ? (
        <MappingStep
          repo={repo}
          job={job}
          fields={wizard.fields}
          mapping={wizard.mapping}
          busy={wizard.busy === "review"}
          onField={wizard.setField}
          onMapping={wizard.setMapping}
          onBack={wizard.reset}
          onContinue={() => void wizard.review()}
        />
      ) : step === "review" ? (
        <ReviewStep
          job={job}
          mode={wizard.mode}
          busy={wizard.busy === "confirm"}
          downloading={errors.pending === job.id}
          onDownloadErrors={() => void errors.download(job.id)}
          onBack={wizard.backToMatch}
          onConfirm={() => void wizard.confirm()}
        />
      ) : (
        <ResultStep job={job} downloading={errors.pending === job.id} onDownloadErrors={() => void errors.download(job.id)} onAgain={wizard.reset} />
      )}
    </Panel>
  );
}
