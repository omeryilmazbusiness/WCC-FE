import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { ACTIVE_BRANCH_HEADER, BRANCH_COOKIE, COMPANY_COOKIE, SESSION_COOKIE, WORKSPACE_HEADER } from "@/shared/api/session";
import { verifySession } from "@/shared/api/server/session-token";
import { canAccessPath, homeFor } from "@/shared/config/permissions";
import { routes } from "@/shared/config/routes";
import { routing } from "@/shared/i18n/routing";
import {
  companyLoginPath,
  companyLoginSlug,
  formatWorkspaceRef,
  isCompanySlug,
  resolveBranch,
  splitWorkspace,
  withWorkspace,
} from "@/shared/lib/workspace-path";

const intlMiddleware = createMiddleware(routing);

const publicPaths = [routes.login];

/** `?any=1` on `/login` opens the generic page even when a company is remembered. */
const ANY_COMPANY_PARAM = "any";

/**
 * UX route guard only: reads the HMAC-signed HttpOnly session snapshot written by the BFF.
 * The backend re-checks every permission (and the branch) on each API call.
 *
 * Each company signs in at `/{locale}/{company}/login`. Signed out, `/login` and every
 * protected URL lead to the company in the URL or the remembered one, else the generic page.
 *
 * Signed-in pages live under `/{locale}/{company}/{branch}/...`: this rewrites them onto
 * the unprefixed app routes, passes the active branch id on, and redirects every other
 * form (unprefixed, foreign company, branch outside the viewer's reach) to the canonical URL.
 */
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const localeMatch = pathname.match(/^\/(en|ar)(?=\/|$)/);
  const locale = localeMatch?.[1] ?? routing.defaultLocale;
  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, "") || "/";
  const { workspace: urlWorkspace, rest } = splitWorkspace(pathWithoutLocale);

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const companyLogin = companyLoginSlug(pathWithoutLocale);
  const isPublic = companyLogin !== null || publicPaths.some((p) => rest === p || rest.startsWith(`${p}/`));

  const redirectTo = (path: string, keepSearch = false) => {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${path === "/" ? "" : path}`;
    if (!keepSearch) url.search = "";
    return NextResponse.redirect(url);
  };

  if (!session) {
    if (companyLogin) return intlMiddleware(req);
    const remembered = req.cookies.get(COMPANY_COOKIE)?.value;
    const company = urlWorkspace?.company ?? (isCompanySlug(remembered) ? remembered : null);
    if (isPublic && !urlWorkspace) {
      if (company && !req.nextUrl.searchParams.has(ANY_COMPANY_PARAM)) return redirectTo(companyLoginPath(company), true);
      return intlMiddleware(req);
    }
    if (pathWithoutLocale === "/") return intlMiddleware(req);
    return redirectTo(company ? companyLoginPath(company) : routes.login);
  }

  const ws = session.workspace;
  const branch = ws
    ? resolveBranch(ws.branches, {
        urlSlug: urlWorkspace?.company === ws.company.slug ? urlWorkspace.branch : null,
        rememberedId: req.cookies.get(BRANCH_COOKIE)?.value,
        homeId: ws.homeBranchId,
      })
    : null;
  const ref = ws && branch ? { company: ws.company.slug, branch: branch.slug } : null;
  const home = homeFor(session.user.role, session.permissions);

  if (session.mfaEnrollmentRequired && rest !== routes.security) {
    return redirectTo(withWorkspace(routes.security, ref));
  }
  if (isPublic || rest === "/") {
    return redirectTo(withWorkspace(session.mfaEnrollmentRequired ? routes.security : home, ref));
  }
  if (!canAccessPath(session.permissions, rest)) {
    return redirectTo(withWorkspace(home, ref));
  }

  // Snapshot from before workspaces existed: serve the plain routes until the next sign-in.
  if (!ref || !branch) {
    return urlWorkspace ? redirectTo(rest, true) : intlMiddleware(req);
  }

  if (urlWorkspace?.company !== ref.company || urlWorkspace.branch !== ref.branch) {
    return redirectTo(withWorkspace(rest, ref), true);
  }

  const target = req.nextUrl.clone();
  target.pathname = `/${locale}${rest === "/" ? "" : rest}`;
  const headers = new Headers(req.headers);
  headers.set(ACTIVE_BRANCH_HEADER, branch.id);
  headers.set(WORKSPACE_HEADER, formatWorkspaceRef(ref));
  const res = NextResponse.rewrite(target, { request: { headers } });
  if (req.cookies.get(BRANCH_COOKIE)?.value !== branch.id) {
    res.cookies.set(BRANCH_COOKIE, branch.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  return res;
}

export const config = {
  matcher: ["/", "/(ar|en)/:path*"],
};
