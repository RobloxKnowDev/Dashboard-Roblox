import type { NextRequest } from "next/server";
import { redirectWithSession, updateSession } from "@/lib/supabase/proxy";

/** Pages reachable without a session. Everything else requires sign-in. */
const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/auth"];
/** Signed-in users are sent away from these. */
const GUEST_ONLY_PATHS = ["/login", "/forgot-password"];

function matches(pathname: string, paths: string[]): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * First security layer: refreshes the session and redirects anonymous
 * visitors to /login. Pages re-verify the user on the server, and RLS
 * policies in PostgreSQL are the final authority on data access.
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

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
