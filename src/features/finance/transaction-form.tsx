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
import { deleteTransaction, saveTransaction } from "./actions";
import {
  CATEGORIES_BY_TYPE,
  CATEGORY_LABELS,
  emptyTransaction,
  transactionSchema,
  type TransactionInput,
  type TransactionType,
} from "./schemas";

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
        toast.success(result.message ?? "Saved");
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
            Add transaction
          </Button>
        )
      }
      title={editing ? "Edit transaction" : "Add transaction"}
      description="Amounts are in USD. Revenue and expenses feed the totals and charts on this page."
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <SegmentedControl
            aria-label="Transaction type"
            value={type}
            onValueChange={changeType}
            options={[
              { value: "revenue", label: "Revenue" },
              { value: "expense", label: "Expense" },
            ]}
          />
        </div>

        <Field htmlFor="t-amount" label="Amount (USD)" required error={errors.amount?.message}>
          <Input
            id="t-amount"
            inputMode="decimal"
            placeholder="0.00"
            autoFocus
            aria-invalid={!!errors.amount}
            aria-describedby={describedBy("t-amount")}
            {...register("amount")}
          />
        </Field>

        <Field htmlFor="t-category" label="Category" error={errors.category?.message}>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select
                id="t-category"
                value={field.value}
                onValueChange={field.onChange}
                options={CATEGORIES_BY_TYPE[type].map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
              />
            )}
          />
        </Field>

        <Field htmlFor="t-date" label="Date" required error={errors.occurredOn?.message}>
          <Input id="t-date" type="date" aria-invalid={!!errors.occurredOn} {...register("occurredOn")} />
        </Field>

        <Field
          htmlFor="t-robux"
          label="Robux"
          error={errors.robuxAmount?.message}
          hint={type === "revenue" ? "Optional — Robux behind this payout." : "Optional — e.g. Robux spent on ads."}
        >
          <Input id="t-robux" inputMode="numeric" placeholder="0" aria-invalid={!!errors.robuxAmount} {...register("robuxAmount")} />
        </Field>

        <Field htmlFor="t-game" label="Game">
          <Controller
            control={control}
            name="gameId"
            render={({ field }) => (
              <Select
                id="t-game"
                value={field.value || NONE}
                onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                options={[{ value: NONE, label: "No game" }, ...options.games.map((g) => ({ value: g.id, label: g.name }))]}
              />
            )}
          />
        </Field>

        <Field htmlFor="t-project" label="Project">
          <Controller
            control={control}
            name="projectId"
            render={({ field }) => (
              <Select
                id="t-project"
                value={field.value || NONE}
                onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                options={[{ value: NONE, label: "No project" }, ...options.projects.map((p) => ({ value: p.id, label: p.name }))]}
              />
            )}
          />
        </Field>

        <Field htmlFor="t-description" label="Description" error={errors.description?.message} className="sm:col-span-2">
          <Textarea
            id="t-description"
            rows={2}
            placeholder={type === "revenue" ? "e.g. DevEx — October earnings" : "e.g. Builder commission — lobby map"}
            aria-invalid={!!errors.description}
            {...register("description")}
          />
        </Field>

        <div className="flex justify-end gap-2 border-t border-line pt-4 sm:col-span-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            {editing ? "Save changes" : "Add transaction"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function EditTransactionButton(props: Omit<TransactionFormModalProps, "trigger"> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <TransactionFormModal
      {...rest}
      trigger={
        <Button variant="ghost" size="icon" aria-label={`Edit ${label}`}>
          <Pencil />
        </Button>
      }
    />
  );
}

export function DeleteTransactionButton({ transactionId, label }: { transactionId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      size="sm"
      trigger={
        <Button variant="ghost" size="icon" aria-label={`Delete ${label}`}>
          <Trash2 />
        </Button>
      }
      title="Delete this transaction?"
      description={`${label} will be removed from the totals and charts.`}
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteTransaction(transactionId);
                if (result.ok) {
                  toast.success(result.message ?? "Transaction deleted");
                  setOpen(false);
                } else toast.error(result.message ?? "The transaction couldn't be deleted.");
              })
            }
          >
            Delete
          </Button>
        </>
      }
    />
  );
}
