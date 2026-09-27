import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/shared/api/session";
import { verifySession } from "@/shared/api/server/session-token";
import { canAccessPath, homeFor } from "@/shared/config/permissions";
import { routes } from "@/shared/config/routes";
import { routing } from "@/shared/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const publicPaths = [routes.login];

/**
 * UX route guard only: reads the HMAC-signed HttpOnly session snapshot written by the BFF.
 * The backend re-checks every permission on each API call.
 */
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const localeMatch = pathname.match(/^\/(en|ar)(?=\/|$)/);
  const locale = localeMatch?.[1] ?? routing.defaultLocale;
  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, "") || "/";

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = publicPaths.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`),
  );

  const redirectTo = (path: string) => {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${path}`;
    url.search = "";
    return NextResponse.redirect(url);
  };

  if (!session) {
    if (isPublic || pathWithoutLocale === "/") return intlMiddleware(req);
    return redirectTo(routes.login);
  }

  const home = homeFor(session.user.role, session.permissions);

  if (session.mfaEnrollmentRequired && pathWithoutLocale !== routes.security) {
    return redirectTo(routes.security);
  }

  if (isPublic || pathWithoutLocale === "/") {
    return redirectTo(session.mfaEnrollmentRequired ? routes.security : home);
  }

  if (!canAccessPath(session.permissions, pathWithoutLocale)) {
    return redirectTo(home);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/", "/(ar|en)/:path*"],
};
