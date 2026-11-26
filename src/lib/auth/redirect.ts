export const DEFAULT_AFTER_LOGIN = "/overview";

/**
 * Returns `next` only if it is a safe internal path ("/projects?x=1"),
 * otherwise the default. Blocks open redirects such as "//evil.com",
 * "/\\evil.com" or "https://evil.com".
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || typeof next !== "string") return DEFAULT_AFTER_LOGIN;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_AFTER_LOGIN;
  if (/[\r\n]/.test(next)) return DEFAULT_AFTER_LOGIN;
  // Never bounce back into the auth pages themselves.
  if (/^\/(login|forgot-password)(\/|\?|$)/.test(next)) return DEFAULT_AFTER_LOGIN;
  return next;
}
