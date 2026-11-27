"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { describedBy, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { savePayouts } from "./payout-actions";
import { payoutFormSchema, type PayoutFormInput } from "./payout-schema";

/** Previous calendar month "YYYY-MM" — the usual month to record. Event handlers only. */
function previousMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function PayoutFormModal({ gameId, gameName, initial, trigger }: { gameId: string; gameName: string; initial?: PayoutFormInput; trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState, setError, reset } = useForm<PayoutFormInput>({
    resolver: zodResolver(payoutFormSchema),
    defaultValues: initial ?? { month: "", creatorRewards: "", robloxPlus: "" },
  });
  const errors = formState.errors;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(initial ?? { month: previousMonth(), creatorRewards: "", robloxPlus: "" });
      }}
      trigger={
        trigger ?? (
          <Button variant="secondary">
            <Plus aria-hidden />
            Record payouts
          </Button>
        )
      }
      title={`Payouts — ${gameName}`}
      description="Robux for the month, from Creator Hub → your experience → Monetization. Leave a field empty to remove it."
    >
      <form
        noValidate
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={handleSubmit((values) =>
          startTransition(async () => {
            const result = await savePayouts(gameId, values);
            if (result.ok) {
              toast.success(result.message ?? "Saved");
              setOpen(false);
              return;
            }
            for (const [field, message] of Object.entries(result.fieldErrors ?? {})) setError(field as keyof PayoutFormInput, { message });
            if (result.message) toast.error(result.message);
          }),
        )}
      >
        <Field htmlFor="p-month" label="Month" required error={errors.month?.message} className="sm:col-span-2">
          <Input
            id="p-month"
            type="month"
            readOnly={!!initial}
            aria-invalid={!!errors.month}
            aria-describedby={describedBy("p-month")}
            className="max-w-48"
            {...register("month")}
          />
        </Field>
        <Field htmlFor="p-creator" label="Creator Rewards (Robux)" error={errors.creatorRewards?.message}>
          <Input id="p-creator" inputMode="numeric" placeholder="0" autoFocus aria-invalid={!!errors.creatorRewards} {...register("creatorRewards")} />
        </Field>
        <Field htmlFor="p-plus" label="Roblox Plus (Robux)" error={errors.robloxPlus?.message}>
          <Input id="p-plus" inputMode="numeric" placeholder="0" aria-invalid={!!errors.robloxPlus} {...register("robloxPlus")} />
        </Field>
        <p className="text-xs leading-relaxed text-fg-3 sm:col-span-2">
          For the current month, enter the total so far and update it later. On daily charts, a month is spread evenly over its days.
        </p>
        <div className="flex justify-end gap-2 border-t border-line pt-4 sm:col-span-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            Save payouts
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function EditPayoutButton(props: { gameId: string; gameName: string; initial: PayoutFormInput; label: string }) {
  return (
    <PayoutFormModal
      {...props}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Edit payouts for ${props.label}`}>
          <Pencil />
        </Button>
      }
    />
  );
}
