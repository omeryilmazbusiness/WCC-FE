/**
 * Workspace URLs: every signed-in page lives under `/{locale}/{company}/{branch}/...`.
 * The app routes themselves stay unprefixed (`/manager`); the middleware rewrites
 * workspace URLs onto them and these helpers add / strip the prefix.
 * Pure and dependency-free so the middleware (Edge) and self-tests can share it.
 */

/** First path segments owned by app routes; a company slug can never be one of them. */
export const ROUTE_ROOTS: ReadonlySet<string> = new Set([
  "login",
  "confirm",
  "security",
  "manager",
  "workspace",
  "customers",
  "pipeline",
  "packages",
  "bookings",
  "finance",
  "targets",
  "import-export",
  "reports",
  "setup",
  "suppliers",
  "missing-docs",
  "tasks",
  "inbox",
  "notifications",
  "admin",
  "hotels",
  "flights",
  "platform",
]);

/** Pages outside any workspace (reached before a session exists). */
const UNSCOPED_ROOTS: ReadonlySet<string> = new Set(["login", "platform", "confirm"]);

/** Remembered sign-in value of platform admins, who belong to no company. */
export const PLATFORM_SIGN_IN = "platform";

/** Platform admins sign in here (`routes.platformLogin`); every other account at its company's page. */
export const PLATFORM_LOGIN_PATH = `/${PLATFORM_SIGN_IN}/login`;

/** Sign-in page of a remembered value (company slug or {@link PLATFORM_SIGN_IN}), else null. */
export function rememberedLoginPath(value: string | null | undefined): string | null {
  if (value === PLATFORM_SIGN_IN) return PLATFORM_LOGIN_PATH;
  return isCompanySlug(value) ? companyLoginPath(value) : null;
}

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export type WorkspaceRef = { company: string; branch: string };

export type SplitPath = {
  workspace: WorkspaceRef | null;
  /** App route path without the workspace prefix; always starts with `/`. */
  rest: string;
};

function segmentsOf(path: string): string[] {
  return path.split("/").filter(Boolean);
}

/** Last segment of a company's sign-in page: `/{company}/login`. */
const COMPANY_LOGIN_SEGMENT = "login";

/** The company of a sign-in page path (`/acme/login` → `acme`), else null. */
export function companyLoginSlug(pathWithoutLocale: string): string | null {
  const segs = segmentsOf(pathWithoutLocale);
  return segs.length === 2 && segs[1] === COMPANY_LOGIN_SEGMENT && isCompanySlug(segs[0]) ? segs[0] : null;
}

export function companyLoginPath(company: string): string {
  return `/${company}/${COMPANY_LOGIN_SEGMENT}`;
}

/** Whether a value can be a company URL segment (shape only; existence is the backend's call). */
export function isCompanySlug(value: string | null | undefined): value is string {
  return Boolean(value) && SLUG.test(value as string) && !ROUTE_ROOTS.has(value as string);
}

/** Splits `/acme/main/bookings/1` into the workspace and `/bookings/1`. */
export function splitWorkspace(pathWithoutLocale: string): SplitPath {
  const segs = segmentsOf(pathWithoutLocale);
  if (companyLoginSlug(pathWithoutLocale)) return { workspace: null, rest: pathWithoutLocale };
  if (segs.length >= 2 && !ROUTE_ROOTS.has(segs[0]) && SLUG.test(segs[0]) && SLUG.test(segs[1])) {
    return {
      workspace: { company: segs[0], branch: segs[1] },
      rest: `/${segs.slice(2).join("/")}`,
    };
  }
  return { workspace: null, rest: pathWithoutLocale || "/" };
}

/** `company/branch` form used to hand the workspace from the middleware to server layouts. */
export function formatWorkspaceRef(ws: WorkspaceRef): string {
  return `${ws.company}/${ws.branch}`;
}

export function parseWorkspaceRef(value: string | null | undefined): WorkspaceRef | null {
  const [company, branch, extra] = (value ?? "").split("/");
  if (extra !== undefined || !company || !branch || !SLUG.test(company) || !SLUG.test(branch)) return null;
  if (ROUTE_ROOTS.has(company)) return null;
  return { company, branch };
}

/** Whether an app path belongs inside a workspace (everything but the login page). */
export function isWorkspaceScoped(path: string): boolean {
  const first = segmentsOf(path)[0];
  return first === undefined || !UNSCOPED_ROOTS.has(first);
}

/**
 * Prefixes an app href (`/bookings?x=1#a`) with the workspace. External, relative,
 * unscoped and already-prefixed hrefs are returned unchanged.
 */
export function withWorkspace(href: string, ws: WorkspaceRef | null | undefined): string {
  if (!ws || !href.startsWith("/") || href.startsWith("//")) return href;
  const cut = href.search(/[?#]/);
  const path = cut === -1 ? href : href.slice(0, cut);
  const tail = cut === -1 ? "" : href.slice(cut);
  if (!isWorkspaceScoped(path) || splitWorkspace(path).workspace) return href;
  const suffix = path === "/" ? "" : path;
  return `/${ws.company}/${ws.branch}${suffix}${tail}`;
}

/** Strips the workspace prefix from a locale-less pathname (for active-nav checks). */
export function withoutWorkspace(pathWithoutLocale: string): string {
  return splitWorkspace(pathWithoutLocale).rest;
}

export type BranchChoice = { id: string; slug: string };

/**
 * Picks the branch a caller acts on: the URL branch when the caller may use it,
 * else the remembered one, else the home branch.
 */
export function resolveBranch<T extends BranchChoice>(
  branches: readonly T[],
  opts: { urlSlug?: string | null; rememberedId?: string | null; homeId: string },
): T | null {
  if (opts.urlSlug) {
    const hit = branches.find((b) => b.slug === opts.urlSlug);
    if (hit) return hit;
  }
  if (opts.rememberedId) {
    const hit = branches.find((b) => b.id === opts.rememberedId);
    if (hit) return hit;
  }
  return branches.find((b) => b.id === opts.homeId) ?? branches[0] ?? null;
}
