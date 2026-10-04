"use client";

import { useTranslations } from "next-intl";
import type { CompanionLink } from "@/entities/customer";

export function companionName(c: CompanionLink): string {
  return c.Companion?.fullName ?? c.companion?.full_name ?? c.companion?.fullName ?? c.companion_id.slice(0, 8);
}

export function companionPhone(c: CompanionLink): string {
  return c.Companion?.phone ?? c.companion?.phone ?? "";
}

export function CountBadge({ n }: { n: number }) {
  return <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-600">{n}</span>;
}

export function RelationLabel({ relation }: { relation: string }) {
  const t = useTranslations("customers.relations");
  return (
    <span className="block truncate text-[11.5px] font-medium text-zinc-500">
      {t.has(relation) ? t(relation as "spouse") : relation || "—"}
    </span>
  );
}
