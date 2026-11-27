import { cookies, headers } from "next/headers";
import { lang } from "next/root-params";
import { createFormat } from "@/lib/utils/format";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, negotiateLocale, type Locale } from "./config";
import { messages } from "./messages";

/*
 * Interface language on the server.
 * - Server Components: getLocale() / getT() / getFormat() read the [lang]
 *   root segment (next/root-params) — no prop drilling, and pages stay
 *   prerendered once per language.
 * - Server Actions and Route Handlers can't read root params: they use
 *   getRequestLocale() (language cookie, else the browser's language).
 */

export async function getLocale(): Promise<Locale> {
  const value = await lang();
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Dictionary of the current language. */
export async function getT() {
  return messages[await getLocale()];
}

/** Number/date formatters of the current language. */
export async function getFormat() {
  return createFormat(await getLocale());
}

/** Everything at once: `const { t, f, locale } = await getI18n()`. */
export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: messages[locale], f: createFormat(locale) };
}

/** For Server Actions and Route Handlers. */
export async function getRequestLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;
  return negotiateLocale((await headers()).get("accept-language"));
}

/** Dictionary for Server Actions and Route Handlers. */
export async function getRequestT() {
  return messages[await getRequestLocale()];
}
