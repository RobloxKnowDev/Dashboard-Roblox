"use client";

import { createContext, use, type ReactNode } from "react";
import { createFormat } from "@/lib/utils/format";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { messages } from "./messages";
import { resolveMessage } from "./resolve";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Set once by the root layout from the [lang] segment. */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale(): Locale {
  return use(LocaleContext);
}

/** Dictionary of the current language: `const t = useT(); t.common.actions.save`. */
export function useT() {
  return messages[useLocale()];
}

/** Number/date formatters of the current language. */
export function useFormat() {
  return createFormat(useLocale());
}

/**
 * Translates a message key carried as data (form validation errors, action
 * results): "auth.validation.emailRequired" → the text in the current
 * language. Unknown keys are returned unchanged.
 */
export function useMessage() {
  const t = useT();
  return (key: string | undefined) => (key ? resolveMessage(t, key) : undefined);
}
