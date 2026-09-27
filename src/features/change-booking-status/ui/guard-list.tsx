"use client";

import { useTranslations } from "next-intl";

/** Translated `guard_failed` codes; unknown codes are shown verbatim. */
export function GuardList({ guards }: { guards: string[] }) {
  const t = useTranslations("bookingStatus.guards");
  if (guards.length === 0) return null;
  return (
    <ul className="list-disc space-y-1 ps-5" data-testid="status-guards">
      {guards.map((guard) => (
        <li key={guard} data-guard={guard}>
          {t.has(guard) ? t(guard) : guard}
        </li>
      ))}
    </ul>
  );
}
