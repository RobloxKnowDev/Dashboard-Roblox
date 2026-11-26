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
import { generalSettingsSchema, NOTIFICATION_PREFS, type GeneralSettingsInput, type NotificationPrefKey } from "./general";
import { setNotificationPref, signOutEverywhere, signOutOtherSessions, updateGeneralSettings } from "./settings-actions";

export function GeneralSettingsForm({ defaults }: { defaults: GeneralSettingsInput }) {
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
              toast.success(result.message ?? "Saved");
              return;
            }
            for (const [field, message] of Object.entries(result.fieldErrors ?? {})) setError(field as keyof GeneralSettingsInput, { message });
            if (result.message) toast.error(result.message);
          }),
        )}
      >
        <Field htmlFor="studioName" label="Studio name" required error={errors.studioName?.message}>
          <Input id="studioName" aria-invalid={!!errors.studioName} aria-describedby={describedBy("studioName")} {...register("studioName")} />
        </Field>
        <Field
          htmlFor="devexRate"
          label="DevEx rate (USD per Robux)"
          required
          error={errors.devexRate?.message}
          hint="Converts Robux into USD estimates on the Overview and Finance pages. Roblox's standard rate is 0.0038."
        >
          <Input id="devexRate" inputMode="decimal" aria-invalid={!!errors.devexRate} className="max-w-40" {...register("devexRate")} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={pending}>
            Save settings
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function NotificationPreferences({ initial }: { initial: Record<NotificationPrefKey, boolean> }) {
  const [prefs, setPrefs] = useState(initial);
  const [, startTransition] = useTransition();

  return (
    <Card>
      <ul className="divide-y divide-line">
        {NOTIFICATION_PREFS.map((pref) => (
          <li key={pref.key} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <label htmlFor={`pref-${pref.key}`} className="text-[13px] font-medium text-fg">
                {pref.label}
              </label>
              <p className="text-xs text-fg-3">{pref.description}</p>
            </div>
            <Switch
              id={`pref-${pref.key}`}
              checked={prefs[pref.key]}
              onCheckedChange={(checked) => {
                const previous = prefs[pref.key];
                setPrefs((p) => ({ ...p, [pref.key]: checked }));
                startTransition(async () => {
                  const result = await setNotificationPref(pref.key, checked);
                  if (result.ok) toast.success(result.message ?? "Saved");
                  else {
                    setPrefs((p) => ({ ...p, [pref.key]: previous }));
                    toast.error(result.message ?? "The preference couldn't be saved.");
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
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  return (
    <Card className="divide-y divide-line">
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[13px] font-medium text-fg">Sign out other sessions</p>
          <p className="text-xs text-fg-3">Every other browser and device is signed out. You stay signed in here.</p>
        </div>
        <Button
          variant="secondary"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await signOutOtherSessions();
              if (result.ok) toast.success(result.message ?? "Done");
              else toast.error(result.message ?? "Something went wrong.");
            })
          }
        >
          <MonitorSmartphone aria-hidden />
          Sign out other sessions
        </Button>
      </div>
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[13px] font-medium text-fg">Sign out everywhere</p>
          <p className="text-xs text-fg-3">Use it if you think someone else has access to your account.</p>
        </div>
        <Modal
          open={confirm}
          onOpenChange={setConfirm}
          size="sm"
          trigger={
            <Button variant="danger">
              <LogOut aria-hidden />
              Sign out everywhere
            </Button>
          }
          title="Sign out everywhere?"
          description="All your sessions end, including this one. You'll need to sign in again."
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
              <Button variant="danger" loading={pending} onClick={() => startTransition(() => signOutEverywhere())}>
                Sign out everywhere
              </Button>
            </>
          }
        />
      </div>
    </Card>
  );
}
