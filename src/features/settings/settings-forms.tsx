"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogOut, MonitorSmartphone } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/checkbox";
import { describedBy, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useMessage, useT } from "@/i18n/client";
import { generalSettingsSchema, NOTIFICATION_PREFS, type GeneralSettingsInput, type NotificationPrefKey } from "./general";
import { setNotificationPref, signOutEverywhere, signOutOtherSessions, updateGeneralSettings } from "./settings-actions";

export function GeneralSettingsForm({ defaults }: { defaults: GeneralSettingsInput }) {
  const t = useT();
  const msg = useMessage();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState, setError } = useForm<GeneralSettingsInput>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: defaults,
  });
  const errors = formState.errors;

  return (
    <Card className="p-5">
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((values) =>
          startTransition(async () => {
            const result = await updateGeneralSettings(values);
            if (result.ok) {
              toast.success(result.message ?? t.settings.toasts.saved);
              return;
            }
            for (const [field, message] of Object.entries(result.fieldErrors ?? {})) setError(field as keyof GeneralSettingsInput, { message });
            if (result.message) toast.error(result.message);
          }),
        )}
      >
        <Field htmlFor="studioName" label={t.settings.general.studioName} required error={msg(errors.studioName?.message)}>
          <Input id="studioName" aria-invalid={!!errors.studioName} aria-describedby={describedBy("studioName")} {...register("studioName")} />
        </Field>
        <Field
          htmlFor="devexRate"
          label={t.settings.general.devexRate}
          required
          error={msg(errors.devexRate?.message)}
          hint={t.settings.general.devexHint}
        >
          <Input id="devexRate" inputMode="decimal" aria-invalid={!!errors.devexRate} className="max-w-40" {...register("devexRate")} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={pending}>
            {t.settings.general.submit}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function NotificationPreferences({ initial }: { initial: Record<NotificationPrefKey, boolean> }) {
  const t = useT();
  const [prefs, setPrefs] = useState(initial);
  const [, startTransition] = useTransition();

  return (
    <Card>
      <ul className="divide-y divide-line">
        {NOTIFICATION_PREFS.map((pref) => (
          <li key={pref.key} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <label htmlFor={`pref-${pref.key}`} className="text-[13px] font-medium text-fg">
                {t.settings.notifications.prefs[pref.key].label}
              </label>
              <p className="text-xs text-fg-3">{t.settings.notifications.prefs[pref.key].description}</p>
            </div>
            <Switch
              id={`pref-${pref.key}`}
              checked={prefs[pref.key]}
              onCheckedChange={(checked) => {
                const previous = prefs[pref.key];
                setPrefs((p) => ({ ...p, [pref.key]: checked }));
                startTransition(async () => {
                  const result = await setNotificationPref(pref.key, checked);
                  if (result.ok) toast.success(result.message ?? t.settings.toasts.saved);
                  else {
                    setPrefs((p) => ({ ...p, [pref.key]: previous }));
                    toast.error(result.message ?? t.settings.notifications.failed);
                  }
                });
              }}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function SessionControls() {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  return (
    <Card className="divide-y divide-line">
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[13px] font-medium text-fg">{t.settings.security.othersTitle}</p>
          <p className="text-xs text-fg-3">{t.settings.security.othersBody}</p>
        </div>
        <Button
          variant="secondary"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await signOutOtherSessions();
              if (result.ok) toast.success(result.message ?? t.settings.toasts.done);
              else toast.error(result.message ?? t.settings.toasts.failed);
            })
          }
        >
          <MonitorSmartphone aria-hidden />
          {t.settings.security.othersTitle}
        </Button>
      </div>
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[13px] font-medium text-fg">{t.settings.security.everywhereTitle}</p>
          <p className="text-xs text-fg-3">{t.settings.security.everywhereBody}</p>
        </div>
        <Modal
          open={confirm}
          onOpenChange={setConfirm}
          size="sm"
          trigger={
            <Button variant="danger">
              <LogOut aria-hidden />
              {t.settings.security.everywhereTitle}
            </Button>
          }
          title={t.settings.security.confirmTitle}
          description={t.settings.security.confirmBody}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                {t.common.actions.cancel}
              </Button>
              <Button variant="danger" loading={pending} onClick={() => startTransition(() => signOutEverywhere())}>
                {t.settings.security.everywhereTitle}
              </Button>
            </>
          }
        />
      </div>
    </Card>
  );
}
