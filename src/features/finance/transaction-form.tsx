"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { describedBy, Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { useMessage, useT } from "@/i18n/client";
import { deleteTransaction, saveTransaction } from "./actions";
import { CATEGORIES_BY_TYPE, emptyTransaction, transactionSchema, type TransactionInput, type TransactionType } from "./schemas";

export type TransactionFormOptions = {
  games: { id: string; name: string }[];
  projects: { id: string; name: string }[];
};

const NONE = "none";

/** Local calendar day — called from event handlers only (never during render). */
function localToday(): string {
  return new Date().toLocaleDateString("en-CA");
}

type TransactionFormModalProps = {
  options: TransactionFormOptions;
  /** Present when editing. */
  transaction?: { id: string; values: TransactionInput };
  trigger?: ReactNode;
};

export function TransactionFormModal({ options, transaction, trigger }: TransactionFormModalProps) {
  const t = useT();
  const msg = useMessage();
  const text = t.finance.form;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const editing = !!transaction;
  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: transaction?.values ?? emptyTransaction,
  });
  const { register, control, handleSubmit, formState, setError, reset, setValue, getValues } = form;
  const errors = formState.errors;
  const type = useWatch({ control, name: "type" });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const result = await saveTransaction(values, transaction?.id);
      if (result.ok) {
        toast.success(result.message ?? (editing ? t.finance.actions.updated : t.finance.actions.added));
        setOpen(false);
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof TransactionInput, { message });
      }
      if (result.message) toast.error(result.message);
    }),
  );

  function changeType(next: TransactionType) {
    setValue("type", next);
    if (!CATEGORIES_BY_TYPE[next].includes(getValues("category"))) {
      setValue("category", CATEGORIES_BY_TYPE[next][0] ?? "other");
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(transaction?.values ?? { ...emptyTransaction, occurredOn: localToday() });
      }}
      size="lg"
      trigger={
        trigger ?? (
          <Button variant="primary">
            <Plus aria-hidden />
            {text.add}
          </Button>
        )
      }
      title={editing ? text.editTitle : text.add}
      description={text.description}
    >
      <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <SegmentedControl
            aria-label={text.typeLabel}
            value={type}
            onValueChange={changeType}
            options={[
              { value: "revenue", label: t.finance.types.revenue },
              { value: "expense", label: t.finance.types.expense },
            ]}
          />
        </div>

        <Field htmlFor="t-amount" label={text.amount} required error={msg(errors.amount?.message)}>
          <Input
            id="t-amount"
            inputMode="decimal"
            placeholder={text.amountPlaceholder}
            autoFocus
            aria-invalid={!!errors.amount}
            aria-describedby={describedBy("t-amount")}
            {...register("amount")}
          />
        </Field>

        <Field htmlFor="t-category" label={text.category} error={msg(errors.category?.message)}>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select
                id="t-category"
                value={field.value}
                onValueChange={field.onChange}
                options={CATEGORIES_BY_TYPE[type].map((c) => ({ value: c, label: t.finance.categories[c] }))}
              />
            )}
          />
        </Field>

        <Field htmlFor="t-date" label={text.date} required error={msg(errors.occurredOn?.message)}>
          <Input id="t-date" type="date" aria-invalid={!!errors.occurredOn} {...register("occurredOn")} />
        </Field>

        <Field
          htmlFor="t-robux"
          label={text.robux}
          error={msg(errors.robuxAmount?.message)}
          hint={type === "revenue" ? text.robuxHintRevenue : text.robuxHintExpense}
        >
          <Input id="t-robux" inputMode="numeric" placeholder="0" aria-invalid={!!errors.robuxAmount} {...register("robuxAmount")} />
        </Field>

        <Field htmlFor="t-game" label={text.game}>
          <Controller
            control={control}
            name="gameId"
            render={({ field }) => (
              <Select
                id="t-game"
                value={field.value || NONE}
                onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                options={[{ value: NONE, label: text.noGame }, ...options.games.map((g) => ({ value: g.id, label: g.name }))]}
              />
            )}
          />
        </Field>

        <Field htmlFor="t-project" label={text.project}>
          <Controller
            control={control}
            name="projectId"
            render={({ field }) => (
              <Select
                id="t-project"
                value={field.value || NONE}
                onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                options={[{ value: NONE, label: text.noProject }, ...options.projects.map((p) => ({ value: p.id, label: p.name }))]}
              />
            )}
          />
        </Field>

        <Field htmlFor="t-description" label={text.descriptionField} error={msg(errors.description?.message)} className="sm:col-span-2">
          <Textarea
            id="t-description"
            rows={2}
            placeholder={type === "revenue" ? text.placeholderRevenue : text.placeholderExpense}
            aria-invalid={!!errors.description}
            {...register("description")}
          />
        </Field>

        <div className="flex justify-end gap-2 border-t border-line pt-4 sm:col-span-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.common.actions.cancel}
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            {editing ? t.common.actions.saveChanges : text.add}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function EditTransactionButton(props: Omit<TransactionFormModalProps, "trigger"> & { label: string }) {
  const t = useT();
  const { label, ...rest } = props;
  return (
    <TransactionFormModal
      {...rest}
      trigger={
        <Button variant="ghost" size="icon" aria-label={t.finance.form.editLabel(label)}>
          <Pencil />
        </Button>
      }
    />
  );
}

export function DeleteTransactionButton({ transactionId, label }: { transactionId: string; label: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      size="sm"
      trigger={
        <Button variant="ghost" size="icon" aria-label={t.finance.form.deleteLabel(label)}>
          <Trash2 />
        </Button>
      }
      title={t.finance.form.deleteTitle}
      description={t.finance.form.deleteDescription(label)}
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.common.actions.cancel}
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteTransaction(transactionId);
                if (result.ok) {
                  toast.success(result.message ?? t.finance.actions.deleted);
                  setOpen(false);
                } else toast.error(result.message ?? t.finance.actions.deleteFailed);
              })
            }
          >
            {t.common.actions.delete}
          </Button>
        </>
      }
    />
  );
}
