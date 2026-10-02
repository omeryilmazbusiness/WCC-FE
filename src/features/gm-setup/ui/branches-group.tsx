"use client";

import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { draftSlug, withMainCenter, type BranchDraft, type BranchDraftErrors } from "../model/flow";
import { GlassGroup, GlassInput } from "./glass";

const MAX_BRANCHES = 30;

type Props = {
  drafts: BranchDraft[];
  errors: BranchDraftErrors;
  onChange: (next: BranchDraft[]) => void;
};

/**
 * The company's branches: a name and whether it is the main center (exactly one).
 * Saved branches cannot be removed here; unsaved ones can.
 */
export function BranchesGroup({ drafts, errors, onChange }: Props) {
  const t = useTranslations("setup.company.branches");

  function rename(index: number, nameEn: string) {
    onChange(drafts.map((d, i) => (i === index ? { ...d, nameEn } : d)));
  }

  return (
    <GlassGroup title={t("title")} footer={t("hint")}>
      {drafts.map((d, i) => {
        const error = errors[i];
        const main = d.kind === "main_center";
        return (
          <div key={d.id || `new-${i}`} className="px-4 py-2.5" data-testid="setup-branch-row">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[11px] font-bold text-white",
                  main ? "bg-gradient-to-b from-sky-400 to-blue-600" : "bg-gradient-to-b from-zinc-300 to-zinc-500",
                )}
                aria-hidden
              >
                {(d.nameEn.trim()[0] ?? "?").toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <GlassInput
                  id={`setup-branch-${i}`}
                  value={d.nameEn}
                  invalid={Boolean(error)}
                  placeholder={t("namePlaceholder")}
                  aria-label={t("name")}
                  onChange={(e) => rename(i, e.target.value)}
                  className="h-9"
                  data-testid="setup-branch-name"
                />
                <p className="truncate text-[11px] text-white/40" dir="ltr">
                  /{draftSlug(d) || "…"}
                </p>
              </div>
              <div
                role="radiogroup"
                aria-label={t("kind")}
                className="grid shrink-0 grid-cols-2 gap-1 rounded-[12px] bg-white/[0.08] p-1"
              >
                {(["main_center", "branch"] as const).map((kind) => {
                  const active = d.kind === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        if (active) return;
                        if (kind === "main_center") onChange(withMainCenter(drafts, i));
                      }}
                      disabled={kind === "branch" && main}
                      title={kind === "branch" && main ? t("mainRequired") : undefined}
                      className={cn(
                        "h-7 rounded-[9px] px-2.5 text-[11px] font-semibold transition-all duration-200",
                        active
                          ? "bg-white/[0.2] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_3px_rgba(0,0,0,0.35)]"
                          : "text-white/55 hover:text-white/85 disabled:hover:text-white/55",
                      )}
                      data-testid={`setup-branch-kind-${kind}`}
                    >
                      {kind === "main_center" ? t("mainCenter") : t("branch")}
                    </button>
                  );
                })}
              </div>
              {!d.id && drafts.length > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    const rest = drafts.filter((_, j) => j !== i);
                    onChange(main ? withMainCenter(rest, 0) : rest);
                  }}
                  className="glass-pill flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/55 hover:text-white/90"
                  aria-label={t("remove")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            {error ? (
              <p className="ps-11 pt-1 text-[11px] font-medium text-rose-300" role="alert">
                {t(`errors.${error}`)}
              </p>
            ) : null}
          </div>
        );
      })}
      {drafts.length < MAX_BRANCHES ? (
        <button
          type="button"
          onClick={() => onChange([...drafts, { id: "", nameEn: "", kind: drafts.length === 0 ? "main_center" : "branch" }])}
          className="flex h-[46px] w-full items-center gap-3 px-4 text-[13px] font-semibold text-sky-300 transition-colors hover:bg-white/[0.06]"
          data-testid="setup-add-branch"
        >
          <span className="flex h-8 w-8 items-center justify-center">
            <Plus className="h-4 w-4" strokeWidth={2.25} />
          </span>
          {t("add")}
        </button>
      ) : null}
    </GlassGroup>
  );
}
