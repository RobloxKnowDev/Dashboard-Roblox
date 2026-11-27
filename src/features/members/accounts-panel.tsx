"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Ellipsis, KeyRound, ShieldOff, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { describedBy, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useFormat, useMessage, useT } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import type { AppRole } from "@/lib/auth/roles";
import { changeRole, createAccount, deleteAccount, revokeAccess } from "./actions";
import type { Account } from "./data";
import { createAccountSchema, emptyAccount, grantableRoles, type CreateAccountInput } from "./schemas";

const roleOptions = (roles: readonly AppRole[], labels: Messages["common"]["roles"]) => roles.map((r) => ({ value: r, label: labels[r] }));

/* ─────────────────────────── Create account ─────────────────────────── */

function CopyButton({ value, label }: { value: string; label: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      aria-label={label}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copied ? t.settings.members.copied : t.settings.members.copy}
    </Button>
  );
}

export function CreateAccountModal({ managerRole }: { managerRole: AppRole }) {
  const t = useT();
  const msg = useMessage();
  const m = t.settings.members;
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<CreateAccountInput>({ resolver: zodResolver(createAccountSchema), defaultValues: emptyAccount });
  const { register, control, handleSubmit, formState, setError, reset } = form;
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const result = await createAccount(values);
      if (result.ok && result.data) {
        setCreated(result.data);
        return;
      }
      if (!result.ok) {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) setError(field as keyof CreateAccountInput, { message });
        if (result.message) toast.error(result.message);
      }
    }),
  );

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setCreated(null);
          reset(emptyAccount);
        }
      }}
      trigger={
        <Button variant="primary">
          <UserPlus aria-hidden />
          {m.create}
        </Button>
      }
      title={created ? m.created : m.create}
      description={created ? m.createdDescription : m.createDescription}
    >
      {created ? (
        <div className="space-y-4">
          <dl className="space-y-3 rounded-md border border-line bg-surface-2/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <dt className="text-xs text-fg-3">{m.email}</dt>
                <dd className="truncate text-[13px] text-fg">{created.email}</dd>
              </div>
              <CopyButton value={created.email} label={m.copyEmail} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <dt className="text-xs text-fg-3">{m.temporaryPassword}</dt>
                <dd className="font-mono text-sm tracking-wide text-fg" data-testid="temporary-password">
                  {created.password}
                </dd>
              </div>
              <CopyButton value={created.password} label={m.copyPassword} />
            </div>
          </dl>
          <p className="flex items-start gap-2 text-xs leading-relaxed text-fg-3">
            <KeyRound className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {m.signInHint}
          </p>
          <div className="flex justify-end border-t border-line pt-4">
            <Button variant="primary" onClick={() => setOpen(false)}>
              {m.done}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <Field htmlFor="a-name" label={m.name} required error={msg(errors.name?.message)}>
            <Input id="a-name" autoFocus aria-invalid={!!errors.name} aria-describedby={describedBy("a-name")} {...register("name")} />
          </Field>
          <Field htmlFor="a-email" label={m.email} required error={msg(errors.email?.message)}>
            <Input id="a-email" type="email" autoComplete="off" aria-invalid={!!errors.email} {...register("email")} />
          </Field>
          <Field
            htmlFor="a-role"
            label={m.role}
            error={msg(errors.role?.message)}
            hint={managerRole === "owner" ? undefined : m.adminHint}
          >
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select id="a-role" value={field.value} onValueChange={field.onChange} options={roleOptions(grantableRoles(managerRole), t.common.roles)} />
              )}
            />
          </Field>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t.common.actions.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {m.create}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ─────────────────────────── Accounts table ─────────────────────────── */

type Confirm = { kind: "revoke" | "delete"; account: Account } | null;

export function AccountsPanel({
  accounts,
  viewer,
  nowIso,
}: {
  accounts: Account[];
  viewer: { id: string; role: AppRole };
  nowIso: string;
}) {
  const t = useT();
  const f = useFormat();
  const m = t.settings.members;
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [pending, startTransition] = useTransition();
  const [approveRole, setApproveRole] = useState<Record<string, AppRole>>({});
  const isOwner = viewer.role === "owner";
  const now = new Date(nowIso);
  const pendingAccounts = accounts.filter((a) => a.role === null);
  const activeAccounts = accounts.filter((a) => a.role !== null);

  function run(action: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message ?? t.settings.toasts.saved);
        after?.();
      } else toast.error(result.message ?? t.settings.toasts.failed);
    });
  }

  const person = (a: Account) => (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={a.name} src={a.avatarUrl} size="md" />
      <div className="min-w-0">
        <p className="truncate font-medium text-fg">
          {a.teamMemberId ? (
            <Link href={`/team/${a.teamMemberId}`} className="hover:text-accent">
              {a.name}
            </Link>
          ) : (
            a.name
          )}
          {a.id === viewer.id ? <span className="ml-1.5 text-xs font-normal text-fg-3">{m.you}</span> : null}
        </p>
        <p className="truncate text-xs text-fg-3">{a.email}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {pendingAccounts.length > 0 ? (
        <section aria-labelledby="pending-heading" className="space-y-2">
          <h3 id="pending-heading" className="text-sm font-semibold text-fg">
            {m.waiting} <Badge tone="warning">{pendingAccounts.length}</Badge>
          </h3>
          <p className="text-xs text-fg-3">{m.waitingHint}</p>
          <div className="overflow-hidden rounded-lg border border-warning/30 bg-surface">
            <Table>
              <TBody>
                {pendingAccounts.map((a) => (
                  <TR key={a.id}>
                    <TD>{person(a)}</TD>
                    <TD className="text-xs text-fg-3">{m.createdOn(f.formatDate(a.createdAt))}</TD>
                    <TD className="text-right">
                      {isOwner ? (
                        <div className="flex items-center justify-end gap-2">
                          <Select
                            aria-label={m.roleFor(a.name)}
                            value={approveRole[a.id] ?? "viewer"}
                            onValueChange={(v) => setApproveRole((s) => ({ ...s, [a.id]: v as AppRole }))}
                            options={roleOptions(["owner", "admin", "developer", "viewer"], t.common.roles)}
                            className="w-36"
                          />
                          <Button size="sm" variant="primary" loading={pending} onClick={() => run(() => changeRole(a.id, approveRole[a.id] ?? "viewer"))}>
                            {m.approve}
                          </Button>
                          <Button variant="ghost" size="icon" aria-label={m.deleteName(a.name)} onClick={() => setConfirm({ kind: "delete", account: a })}>
                            <Trash2 />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-fg-3">{m.ownerMustApprove}</span>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </section>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <Table>
          <caption className="sr-only">{m.caption}</caption>
          <THead>
            <TR>
              <TH>{m.member}</TH>
              <TH>{m.role}</TH>
              <TH className="hidden md:table-cell">{m.lastSignIn}</TH>
              <TH className="hidden lg:table-cell">{m.createdColumn}</TH>
              <TH className="w-12">
                <span className="sr-only">{m.actions}</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {activeAccounts.map((a) => {
              const editable = isOwner && a.id !== viewer.id;
              return (
                <TR key={a.id}>
                  <TD>{person(a)}</TD>
                  <TD>
                    {editable ? (
                      <Select
                        aria-label={m.roleOf(a.name)}
                        value={a.role ?? undefined}
                        disabled={pending}
                        onValueChange={(v) => run(() => changeRole(a.id, v as AppRole))}
                        options={roleOptions(["owner", "admin", "developer", "viewer"], t.common.roles)}
                        className="w-40"
                      />
                    ) : (
                      <Badge tone={a.role === "owner" ? "accent" : a.role === "admin" ? "info" : "neutral"}>{a.role ? t.common.roles[a.role] : "—"}</Badge>
                    )}
                  </TD>
                  <TD className="hidden text-xs text-fg-3 md:table-cell">
                    {a.lastSignInAt ? (
                      <time dateTime={a.lastSignInAt} title={f.formatDate(a.lastSignInAt)}>
                        {f.formatRelative(a.lastSignInAt, now)}
                      </time>
                    ) : (
                      m.never
                    )}
                  </TD>
                  <TD className="hidden text-xs text-fg-3 lg:table-cell">{f.formatDate(a.createdAt)}</TD>
                  <TD className="text-right">
                    {editable ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={m.actionsFor(a.name)}>
                            <Ellipsis />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => setConfirm({ kind: "revoke", account: a })}>
                            <ShieldOff aria-hidden />
                            {m.revoke}
                          </DropdownMenuItem>
                          <DropdownMenuItem destructive onSelect={() => setConfirm({ kind: "delete", account: a })}>
                            <Trash2 aria-hidden />
                            {m.deleteAccount}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </div>
      {!isOwner ? <p className="text-xs text-fg-3">{m.ownersOnly}</p> : null}

      <Modal
        open={confirm !== null}
        onOpenChange={(next) => !next && setConfirm(null)}
        size="sm"
        title={confirm?.kind === "delete" ? m.confirmDeleteTitle(confirm.account.name) : m.confirmRevokeTitle(confirm?.account.name ?? "")}
        description={confirm?.kind === "delete" ? m.confirmDeleteBody : m.confirmRevokeBody}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              {t.common.actions.cancel}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => {
                if (!confirm) return;
                const id = confirm.account.id;
                run(() => (confirm.kind === "delete" ? deleteAccount(id) : revokeAccess(id)), () => setConfirm(null));
              }}
            >
              {confirm?.kind === "delete" ? m.deleteAccount : m.revoke}
            </Button>
          </>
        }
      />
    </div>
  );
}
