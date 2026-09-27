"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createSearchRepository, SEARCH_KINDS, type SearchHit, type SearchKind } from "@/entities/search";
import { useRouter } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { useFilterState } from "@/shared/lib/use-filter-state";
import { SearchFilterBar, TONES } from "@/shared/ui";
import { hitHref, hitLook } from "../model/hit-look";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;
const LIMIT = 20;

type TypeFilter = "all" | SearchKind;
const FILTER_DEFAULTS: { type: TypeFilter } = { type: "all" };

const repo = createSearchRepository();

type Results = { key: string; hits: SearchHit[] } | null;

/** Cross-entity search with a type filter; results open under the bar. */
export function GlobalSearch({ className }: { className?: string }) {
  const t = useTranslations("search");
  const router = useRouter();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const filters = useFilterState(FILTER_DEFAULTS);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [results, setResults] = useState<Results>(null);
  const [error, setError] = useState(false);

  const term = useDebouncedValue(q.trim(), DEBOUNCE_MS);
  const kinds = useMemo(
    () => (filters.values.type === "all" ? [] : [filters.values.type]),
    [filters.values.type],
  );
  const requestKey = term.length >= MIN_CHARS ? `${filters.values.type}:${term}` : "";
  const loading = requestKey !== "" && results?.key !== requestKey && !error;
  const hits = results && results.key === requestKey ? results.hits : [];

  useEffect(() => {
    if (!requestKey) return;
    let stale = false;
    repo
      .search(term, { kinds, limit: LIMIT })
      .then((res) => {
        if (stale) return;
        setError(false);
        setResults({ key: requestKey, hits: res.hits });
        setActiveIndex(res.hits.length ? 0 : -1);
      })
      .catch(() => {
        if (!stale) setError(true);
      });
    return () => {
      stale = true;
    };
  }, [requestKey, term, kinds]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (wrapRef.current?.contains(target) || target.closest("[data-radix-popper-content-wrapper]")) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function changeQuery(value: string) {
    setQ(value);
    setError(false);
    setOpen(true);
  }

  function go(hit: SearchHit) {
    setOpen(false);
    setQ("");
    router.push(hitHref(hit));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!hits.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => (i + step + hits.length) % hits.length);
    } else if (e.key === "Enter" && open && activeIndex >= 0) {
      e.preventDefault();
      go(hits[activeIndex]);
    }
  }

  const showPanel = open && q.trim().length >= MIN_CHARS;
  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <div ref={wrapRef} className={cn("relative min-w-0 w-full", className)}>
      <SearchFilterBar
        value={q}
        onValueChange={changeQuery}
        placeholder={t("placeholder")}
        clearLabel={t("clear")}
        loading={loading}
        sections={[
          {
            id: "type",
            label: t("filterType"),
            value: filters.values.type,
            onChange: (v: TypeFilter) => {
              filters.set("type", v);
              setOpen(true);
            },
            options: [
              { value: "all", label: t("all") },
              ...SEARCH_KINDS.map((k) => ({ value: k, label: t(`kinds.${k}`) })),
            ],
          },
        ]}
        inputProps={{
          role: "combobox",
          "aria-label": t("placeholder"),
          "aria-expanded": showPanel,
          "aria-controls": listId,
          "aria-autocomplete": "list",
          "aria-activedescendant": showPanel && activeIndex >= 0 ? optionId(activeIndex) : undefined,
          onKeyDown,
          onFocus: () => setOpen(true),
          "data-testid": "global-search",
        }}
      />
      {showPanel ? (
        <div
          className="absolute inset-x-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-[22px] border border-zinc-200/80 bg-white shadow-[0_20px_50px_-24px_rgba(15,23,42,0.45)]"
          data-testid="global-search-results"
        >
          <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400" aria-live="polite">
            {loading ? t("searching") : error ? t("empty") : t("results", { count: hits.length })}
          </p>
          <ul id={listId} role="listbox" aria-label={t("placeholder")} className="max-h-80 overflow-y-auto p-2">
            {hits.map((hit, i) => {
              const look = hitLook(hit);
              const Icon = look.icon;
              const kindLabel = t.has(`entity.${hit.entityType}`)
                ? t(`entity.${hit.entityType}` as "entity.customer")
                : hit.entityType;
              return (
                <li key={`${hit.entityType}-${hit.id}`} id={optionId(i)} role="option" aria-selected={i === activeIndex}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => go(hit)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-start transition-colors",
                      i === activeIndex ? "bg-zinc-100" : "hover:bg-zinc-50",
                    )}
                    data-testid="global-search-hit"
                  >
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", TONES[look.tone].soft)}>
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-zinc-900">{hit.title}</span>
                      {hit.subtitle ? (
                        <span className="block truncate text-xs font-medium text-zinc-500">{hit.subtitle}</span>
                      ) : null}
                    </span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", TONES[look.tone].soft)}>
                      {kindLabel}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
