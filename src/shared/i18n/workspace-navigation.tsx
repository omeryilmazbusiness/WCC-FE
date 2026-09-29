"use client";

import { createContext, forwardRef, useContext, useMemo, type ComponentProps, type ReactNode } from "react";
import { createNavigation } from "next-intl/navigation";
import { splitWorkspace, withWorkspace, type WorkspaceRef } from "@/shared/lib/workspace-path";
import { routing } from "./routing";

const intl = createNavigation(routing);

type IntlHref = ComponentProps<typeof intl.Link>["href"];

/**
 * Workspace resolved by the middleware for this request. During SSR the pathname is
 * the rewritten app route (no workspace), so without it server and client markup differ.
 */
const ServerWorkspaceContext = createContext<WorkspaceRef | null>(null);

export function WorkspaceRefProvider({ value, children }: { value: WorkspaceRef | null; children: ReactNode }) {
  return <ServerWorkspaceContext.Provider value={value}>{children}</ServerWorkspaceContext.Provider>;
}

/** Workspace (`company/branch`) of the current page URL, if any. */
export function useWorkspaceRef(): WorkspaceRef | null {
  const path = intl.usePathname();
  const fallback = useContext(ServerWorkspaceContext);
  const ws = splitWorkspace(path).workspace ?? fallback;
  const company = ws?.company;
  const branch = ws?.branch;
  return useMemo(() => (company && branch ? { company, branch } : null), [company, branch]);
}

function prefixHref(href: IntlHref, ws: WorkspaceRef | null): IntlHref {
  if (typeof href === "string") return withWorkspace(href, ws);
  if (href && typeof href === "object" && typeof href.pathname === "string") {
    return { ...href, pathname: withWorkspace(href.pathname, ws) } as IntlHref;
  }
  return href;
}

/** next-intl Link that stays inside the current company / branch. */
export const Link = forwardRef<HTMLAnchorElement, ComponentProps<typeof intl.Link>>(
  function WorkspaceLink({ href, ...rest }, ref) {
    const ws = useWorkspaceRef();
    return <intl.Link ref={ref} href={prefixHref(href, ws)} {...rest} />;
  },
);

/** App route of the current page (`/bookings/1`), without locale or workspace. */
export function usePathname(): string {
  return splitWorkspace(intl.usePathname()).rest;
}

type IntlRouter = ReturnType<typeof intl.useRouter>;

export function useRouter(): IntlRouter {
  const router = intl.useRouter();
  const ws = useWorkspaceRef();
  return useMemo<IntlRouter>(
    () => ({
      ...router,
      push: (href, options) => router.push(prefixHref(href as IntlHref, ws) as typeof href, options),
      replace: (href, options) =>
        router.replace(prefixHref(href as IntlHref, ws) as typeof href, options),
      prefetch: (href, options) =>
        router.prefetch(prefixHref(href as IntlHref, ws) as typeof href, options),
    }),
    [router, ws],
  );
}
