"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ESCALATION_ROLES,
  type AdminConfigRepository,
  type EscalationInput,
  type EscalationRule,
} from "@/entities/adminconfig";
import { cn } from "@/shared/lib/cn";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Badge, Button, Input, QueryState, useMutationFeedback } from "@/shared/ui";

type Props = { repo: AdminConfigRepository; canWrite: boolean };

const severityTone = {
  critical: "bg-rose-50 text-rose-700",
  warning: "bg-amber-50 text-amber-800",
  info: "bg-zinc-100 text-zinc-600",
} as const;

function inputOf(rule: EscalationRule): EscalationInput {
  return {
    escalateAfterSeconds: rule.escalateAfterSeconds,
    escalateToRoles: [...rule.escalateToRoles],
    enabled: rule.enabled,
  };
}

function sameInput(a: EscalationInput, b: EscalationInput) {
  return (
    a.escalateAfterSeconds === b.escalateAfterSeconds &&
    a.enabled === b.enabled &&
    a.escalateToRoles.length === b.escalateToRoles.length &&
    a.escalateToRoles.every((r) => b.escalateToRoles.includes(r))
  );
}

/**
 * Escalation matrix the engine runs (defaults merged with branch overrides, T-285):
 * turn a rule off, change its delay or who it escalates to, or reset to the default.
 */
export function EscalationSection({ repo, canWrite }: Props) {
  const t = useTranslations("adminSettings");
  const feedback = useMutationFeedback();
  const query = useApiQuery(() => repo.listEscalation(), [repo]);
  const [drafts, setDrafts] = useState<Record<string, EscalationInput>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function run(kind: string, fn: () => Promise<void>) {
    setBusy(kind);
    try {
      await fn();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[kind];
        return next;
      });
      await query.refresh();
      feedback.success(t("saved"));
    } catch (err) {
      feedback.error(err, t("actionError"));
    } finally {
      setBusy(null);
    }
  }

  const rules = query.data ?? [];

  return (
    <QueryState
      loading={query.loading}
      error={query.error}
      onRetry={() => void query.reload()}
      empty={rules.length === 0}
      emptyTitle={t("empty")}
    >
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5" data-testid="escalation-section">
        <p className="text-xs text-zinc-500">{t("escalation.hint")}</p>
        <ul className="mt-3 divide-y divide-zinc-100">
          {rules.map((rule) => {
            const saved = inputOf(rule);
            const draft = drafts[rule.kind] ?? saved;
            const dirty = !sameInput(draft, saved);
            const edit = (next: Partial<EscalationInput>) =>
              setDrafts({ ...drafts, [rule.kind]: { ...draft, ...next } });
            const minutes = Math.round(draft.escalateAfterSeconds / 60);
            const invalid = !Number.isInteger(minutes) || minutes < 0;
            return (
              <li key={rule.kind} className="space-y-2 py-3" data-testid="escalation-rule">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-semibold", draft.enabled ? "text-zinc-900" : "text-zinc-400")}>
                      {rule.defaultTitle || rule.kind}
                    </p>
                    <p className="text-[11px] text-zinc-400">{rule.kind}</p>
                  </div>
                  <Badge className={cn("normal-case", severityTone[rule.severity] ?? severityTone.info)}>
                    {rule.severity}
                  </Badge>
                  {rule.overridden ? (
                    <Badge className="normal-case bg-sky-50 text-sky-800">{t("escalation.overridden")}</Badge>
                  ) : null}
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-zinc-900"
                      checked={draft.enabled}
                      disabled={!canWrite}
                      onChange={(e) => edit({ enabled: e.target.checked })}
                    />
                    {draft.enabled ? t("enabled") : t("disabled")}
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-zinc-500">
                    {t("escalation.after")}
                    <Input
                      type="number"
                      min={0}
                      className="h-8 w-24"
                      disabled={!canWrite || !draft.enabled}
                      value={minutes}
                      onChange={(e) => edit({ escalateAfterSeconds: Math.trunc(Number(e.target.value)) * 60 })}
                    />
                    {t("escalation.minutes")}
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("escalation.roles")}>
                    <span className="text-xs text-zinc-500">{t("escalation.roles")}:</span>
                    {ESCALATION_ROLES.map((role) => {
                      const on = draft.escalateToRoles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          aria-pressed={on}
                          disabled={!canWrite || !draft.enabled}
                          onClick={() =>
                            edit({
                              escalateToRoles: on
                                ? draft.escalateToRoles.filter((r) => r !== role)
                                : [...draft.escalateToRoles, role],
                            })
                          }
                          className={cn(
                            "rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50",
                            on ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                          )}
                        >
                          {t(`roles.${role}`)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="ms-auto flex gap-2">
                    {rule.overridden ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!canWrite || busy !== null}
                        onClick={() => void run(rule.kind, () => repo.resetEscalation(rule.kind))}
                      >
                        {t("escalation.reset")}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      disabled={!canWrite || !dirty || invalid || busy !== null}
                      onClick={() => void run(rule.kind, () => repo.putEscalation(rule.kind, draft))}
                    >
                      {t("save")}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </QueryState>
  );
}
