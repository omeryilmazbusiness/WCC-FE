"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createSearchRepository,
  type SearchHit,
} from "@/entities/search";
import { routes } from "@/shared/config/routes";
import { useRouter } from "@/shared/i18n/navigation";
import { SearchField } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

function hrefForHit(hit: SearchHit): string {
  switch (hit.entityType) {
    case "customer":
      return routes.customer(hit.id);
    case "booking":
      return routes.booking(hit.id);
    case "package":
    case "departure":
      return routes.packages;
    case "lead":
      return routes.pipeline;
    case "conversation":
      return routes.inbox;
    case "task":
      return routes.tasks;
    case "supplier":
      return routes.suppliers;
    default:
      if (hit.hrefHint === "customers") return routes.customers;
      if (hit.hrefHint === "bookings") return routes.bookings;
      if (hit.hrefHint === "pipeline") return routes.pipeline;
      if (hit.hrefHint === "inbox") return routes.inbox;
      return routes.workspace;
  }
}

export function GlobalSearch() {
  const t = useTranslations("search");
  const router = useRouter();
  const repo = useMemo(() => createSearchRepository(), []);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    const handle = window.setTimeout(() => {
      setBusy(true);
      void repo
        .search(trimmed)
        .then((res) => {
          setHits(res.hits);
          setOpen(true);
        })
        .catch(() => {
          setHits([]);
          setOpen(false);
        })
        .finally(() => setBusy(false));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [q, repo]);

  function go(hit: SearchHit) {
    setOpen(false);
    setQ("");
    router.push(hrefForHit(hit));
  }

  return (
    <div ref={wrapRef} className="relative me-2 hidden min-w-0 flex-1 sm:block md:max-w-md lg:max-w-lg">
      <SearchField
        variant="minimal"
        value={q}
        onValueChange={setQ}
        placeholder={t("placeholder")}
        clearLabel={t("clear")}
        containerClassName="max-w-none"
        aria-label={t("placeholder")}
        aria-expanded={open}
        aria-autocomplete="list"
        role="combobox"
        data-testid="global-search"
      />
      {open ? (
        <div
          className="absolute inset-x-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_16px_40px_-20px_rgba(15,23,42,0.35)]"
          role="listbox"
          data-testid="global-search-results"
        >
          {busy && hits.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-500">{t("searching")}</p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-500">{t("empty")}</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {hits.map((hit) => (
                <li key={`${hit.entityType}-${hit.id}`}>
                  <button
                    type="button"
                    role="option"
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-4 py-2.5 text-start transition hover:bg-zinc-50",
                    )}
                    onClick={() => go(hit)}
                  >
                    <span className="text-sm font-semibold text-zinc-900">
                      {hit.title}
                    </span>
                    <span className="text-[11px] font-medium text-zinc-400">
                      {t(`entity.${hit.entityType}` as "entity.customer") ||
                        hit.entityType}
                      {hit.subtitle ? ` · ${hit.subtitle}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
