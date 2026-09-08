import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import { homeForRole, routes } from "@/shared/config/routes";
import { routing } from "@/shared/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const publicPaths = [routes.login];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const localeMatch = pathname.match(/^\/(en|ar)(?=\/|$)/);
  const locale = localeMatch?.[1] ?? routing.defaultLocale;
  const pathWithoutLocale =
    pathname.replace(/^\/(en|ar)/, "") || "/";

  const session = parseSession(req.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = publicPaths.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`),
  );

  if (!session && !isPublic && pathWithoutLocale !== "/") {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${routes.login}`;
    return NextResponse.redirect(url);
  }

  if (session && (pathWithoutLocale === routes.login || pathWithoutLocale === "/")) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${homeForRole(session.user.role)}`;
    return NextResponse.redirect(url);
  }

  if (
    session?.user.role === "employee" &&
    pathWithoutLocale.startsWith(routes.manager)
  ) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${routes.workspace}`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/", "/(ar|en)/:path*"],
};
