"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Select } from "@/components/ui/select";
import { setLocale } from "@/i18n/actions";
import { useLocale, useT } from "@/i18n/client";
import { LOCALE_NAMES, LOCALES, type Locale } from "@/i18n/config";

/** Switches the interface language (cookie) and reloads the page in it. */
function useChangeLocale() {
  const router = useRouter();
  const t = useT();
  const [pending, startTransition] = useTransition();
  function change(next: Locale) {
    startTransition(async () => {
      const result = await setLocale(next);
      if (result.ok) router.refresh();
      else toast.error(t.common.language.failed);
    });
  }
  return { change, pending };
}

/** Language choice inside the account menu. */
export function LanguageMenuItems() {
  const t = useT();
  const locale = useLocale();
  const { change, pending } = useChangeLocale();
  return (
    <>
      <DropdownMenuLabel className="flex items-center gap-2 px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-fg-3">
        <Languages className="size-3.5" aria-hidden />
        {t.shell.userMenu.language}
      </DropdownMenuLabel>
      {LOCALES.map((option) => (
        <DropdownMenuCheckboxItem
          key={option}
          checked={option === locale}
          disabled={pending}
          lang={option}
          onCheckedChange={() => {
            if (option !== locale) change(option);
          }}
        >
          {LOCALE_NAMES[option]}
        </DropdownMenuCheckboxItem>
      ))}
    </>
  );
}

/** Language field for Settings → Profile. */
export function LanguageSelect({ id }: { id?: string }) {
  const t = useT();
  const locale = useLocale();
  const { change, pending } = useChangeLocale();
  return (
    <Select
      id={id}
      aria-label={t.common.language.label}
      value={locale}
      disabled={pending}
      onValueChange={(value) => {
        if (value !== locale) change(value as Locale);
      }}
      options={LOCALES.map((option) => ({ value: option, label: LOCALE_NAMES[option] }))}
      className="w-48"
    />
  );
}
