"use client";

import { useTranslations } from "next-intl";
import { formatDiffValue } from "@/shared/lib/diff-objects";
import { readableChanges, readableFacts } from "../story";
import type { AuditEvent } from "../model";

function humanize(code: string): string {
  const text = code.replace(/[._]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function pretty(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return formatDiffValue(value);
}

/** Expanded row: only the fields a person can read. No IDs, JSON or request metadata. */
export function AuditEventDetails({ event }: { event: AuditEvent }) {
  const t = useTranslations("audit.details");
  const tf = useTranslations("audit.fields");
  const changes = readableChanges(event);
  const facts = readableFacts(event.extra);

  if (changes.length === 0 && facts.length === 0) {
    return (
      <p className="text-[13px] text-zinc-500" data-testid="audit-event-details">
        {t("noChanges")}
      </p>
    );
  }

  return (
    <ul className="space-y-2.5" data-testid="audit-event-details">
      {changes.map((entry) => (
        <li key={entry.key} className="text-[13.5px] leading-snug" data-diff-kind={entry.kind}>
          <span className="font-medium text-zinc-800">{tf.has(entry.key) ? tf(entry.key) : humanize(entry.key)}</span>
          <span className="mt-0.5 block text-zinc-500">
            {entry.kind === "added" ? (
              pretty(entry.after)
            ) : entry.kind === "removed" ? (
              <span className="line-through">{pretty(entry.before)}</span>
            ) : (
              <>
                <span className="line-through">{pretty(entry.before)}</span>
                <span className="mx-1.5 text-zinc-300" aria-hidden>
                  →
                </span>
                <span className="font-medium text-zinc-700">{pretty(entry.after)}</span>
              </>
            )}
          </span>
        </li>
      ))}
      {facts.map((fact) => (
        <li key={fact.key} className="text-[13.5px] leading-snug">
          <span className="font-medium text-zinc-800">{tf.has(fact.key) ? tf(fact.key) : humanize(fact.key)}</span>
          <span className="mt-0.5 block text-zinc-500">{tf.has(`values.${fact.value}`) ? tf(`values.${fact.value}`) : fact.value}</span>
        </li>
      ))}
    </ul>
  );
}
