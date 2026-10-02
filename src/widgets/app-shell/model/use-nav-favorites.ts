"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MAX_NAV_FAVORITES, type UiPreferenceRepository } from "@/entities/ui-preference";
import type { GuardedRoute } from "@/shared/config/permissions";
import { useToast } from "@/shared/ui";
import { reorder, resolveFavorites, type FavoriteItem, type NavGroup } from "./nav";

export type NavFavorites = {
  items: FavoriteItem[];
  isFull: boolean;
  isCustomized: boolean;
  has: (href: GuardedRoute) => boolean;
  /** Pins `href` at `index` (default: end); an existing favorite is moved instead. */
  add: (href: GuardedRoute, index?: number) => boolean;
  /** `to` is an insertion index in the current list. */
  move: (href: GuardedRoute, to: number) => void;
  remove: (href: GuardedRoute, label: string) => void;
  reset: () => void;
};

type Options = {
  groups: readonly NavGroup[];
  /** Server-rendered value so the first paint already shows the user's shortcuts. */
  initial: string[] | null;
  repository: UiPreferenceRepository;
};

/** Pinned sidebar shortcuts, saved optimistically to the caller's preferences. */
export function useNavFavorites({ groups, initial, repository }: Options): NavFavorites {
  const t = useTranslations("nav.favorites");
  const toast = useToast();
  const [saved, setSaved] = useState<string[] | null>(initial);
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const seq = useRef(0);

  const items = useMemo(() => resolveFavorites(groups, saved), [groups, saved]);
  const hrefs = useMemo(() => items.map((item) => item.href), [items]);

  const commit = useCallback(
    (next: GuardedRoute[] | null) => {
      const previous = savedRef.current;
      setSaved(next);
      const id = ++seq.current;
      repository.setNavFavorites(next).then(
        (res) => {
          if (id === seq.current) setSaved(res.navFavorites);
        },
        () => {
          if (id !== seq.current) return;
          setSaved(previous);
          toast.push({ tone: "error", title: t("saveFailed") });
        },
      );
    },
    [repository, t, toast],
  );

  const move = useCallback(
    (href: GuardedRoute, to: number) => {
      const from = hrefs.indexOf(href);
      if (from < 0 || to === from || to === from + 1) return;
      commit(reorder(hrefs, from, to));
    },
    [commit, hrefs],
  );

  const add = useCallback(
    (href: GuardedRoute, index = hrefs.length) => {
      if (hrefs.includes(href)) {
        move(href, index);
        return true;
      }
      if (hrefs.length >= MAX_NAV_FAVORITES) {
        toast.push({ tone: "info", title: t("full", { max: MAX_NAV_FAVORITES }) });
        return false;
      }
      const next = [...hrefs];
      next.splice(Math.max(0, Math.min(index, next.length)), 0, href);
      commit(next);
      return true;
    },
    [commit, hrefs, move, t, toast],
  );

  const remove = useCallback(
    (href: GuardedRoute, label: string) => {
      if (!hrefs.includes(href)) return;
      const before = hrefs;
      commit(hrefs.filter((h) => h !== href));
      toast.push({
        title: t("removed", { name: label }),
        action: { label: t("undo"), onClick: () => commit(before) },
      });
    },
    [commit, hrefs, t, toast],
  );

  const reset = useCallback(() => commit(null), [commit]);
  const has = useCallback((href: GuardedRoute) => hrefs.includes(href), [hrefs]);

  const isCustomized = saved !== null;
  return useMemo(
    () => ({
      items,
      isFull: items.length >= MAX_NAV_FAVORITES,
      isCustomized,
      has,
      add,
      move,
      remove,
      reset,
    }),
    [items, isCustomized, has, add, move, remove, reset],
  );
}
