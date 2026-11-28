import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, negotiateLocale, type Locale } from "@/i18n/config";
import { redirectWithSession, updateSession } from "@/lib/supabase/proxy";

/** Pages reachable without a session. Everything else requires sign-in. */
// /api/cron authenticates itself with CRON_SECRET, /api/agents with a
// machine token (no user session).
const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/auth", "/api/cron", "/api/agents"];
/** Signed-in users are sent away from these. */
const GUEST_ONLY_PATHS = ["/login", "/forgot-password"];
/** Route handlers: they live outside app/[lang] and are never rewritten. */
const UNLOCALIZED_PATHS = ["/api", "/auth"];

function matches(pathname: string, paths: string[]): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/** Interface language: the visitor's choice (cookie), else their browser's. */
function requestLocale(request: NextRequest): Locale {
  const chosen = request.cookies.get(LOCALE_COOKIE)?.value;
  return isLocale(chosen) ? chosen : negotiateLocale(request.headers.get("accept-language"));
}

/**
 * First security layer: refreshes the session and redirects anonymous
 * visitors to /login. Pages re-verify the user on the server, and RLS
 * policies in PostgreSQL are the final authority on data access.
 *
 * Also picks the interface language: page requests are rewritten to
 * /[lang]/… (prerendered once per language), so addresses never carry it.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // An address with a language prefix (/fr/overview, shared by someone):
  // remember that language and continue on the plain address.
  const prefix = /^\/([a-z]{2})(?=\/|$)/.exec(pathname)?.[1];
  if (isLocale(prefix)) {
    const target = request.nextUrl.clone();
    target.pathname = pathname.slice(prefix.length + 1) || "/overview";
    const redirect = NextResponse.redirect(target);
    redirect.cookies.set(LOCALE_COOKIE, prefix, { path: "/", maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: "lax" });
    return redirect;
  }

  const localized = !matches(pathname, UNLOCALIZED_PATHS);
  const locale = requestLocale(request);
  const { response, userId } = await updateSession(request, () =>
    localized
      ? NextResponse.rewrite(new URL(`/${locale}${pathname === "/" ? "" : pathname}${search}`, request.url), { request })
      : NextResponse.next({ request }),
  );

  if (!userId && !matches(pathname, PUBLIC_PATHS)) {
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
    return redirectWithSession(login, response);
  }

  if (userId && matches(pathname, GUEST_ONLY_PATHS)) {
    return redirectWithSession(new URL("/overview", request.url), response);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimization.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
