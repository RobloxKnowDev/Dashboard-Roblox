"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { describedBy, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { initialFormState, type FormState } from "@/features/auth/schemas";
import { GAME_STATUS, statusOptions } from "@/features/shared/status";
import { useMessage, useT } from "@/i18n/client";
import { addGame, removeGame, updateGameStatus } from "./actions";

/** "Add game" button + modal (administrators). */
export function AddGameButton() {
  const t = useT();
  const msg = useMessage();
  const [open, setOpen] = useState(false);
  const [universeId, setUniverseId] = useState("");
  const [state, formAction, pending] = useActionState(async (previous: FormState, formData: FormData) => {
    const result = await addGame(previous, formData);
    if (result.status === "success") {
      toast.success(result.message ?? t.games.admin.gameAdded);
      setOpen(false);
      setUniverseId("");
      return initialFormState;
    }
    return result;
  }, initialFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="primary">
          <Plus aria-hidden />
          {t.games.admin.addGame}
        </Button>
      }
      title={t.games.admin.addTitle}
      description={t.games.admin.addDescription}
    >
      <form action={formAction} className="space-y-4" noValidate>
        {state.status === "error" && state.message ? (
          <p role="alert" className="rounded-md border border-critical/25 bg-critical/10 px-3 py-2 text-[13px] text-critical">
            {msg(state.message)}
          </p>
        ) : null}
        <Field
          htmlFor="universeId"
          label={t.games.admin.universeId}
          required
          error={msg(errors.universeId)}
          hint={t.games.admin.universeIdHint}
        >
          <Input
            id="universeId"
            name="universeId"
            inputMode="numeric"
            autoComplete="off"
            placeholder="10770686826"
            value={universeId}
            onChange={(e) => setUniverseId(e.target.value)}
            aria-invalid={!!errors.universeId}
            aria-describedby={describedBy("universeId")}
            className="font-mono"
          />
        </Field>
        <Field htmlFor="status" label={t.games.admin.status}>
          <Select id="status" name="status" defaultValue="live" options={statusOptions(GAME_STATUS, t.common.status.game)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.common.actions.cancel}
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            {pending ? t.games.admin.adding : t.games.admin.addGame}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Inline status selector (administrators). */
export function GameStatusSelect({ gameId, status }: { gameId: string; status: string }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  return (
    <Select
      aria-label={t.games.admin.statusLabel}
      value={status}
      disabled={pending}
      options={statusOptions(GAME_STATUS, t.common.status.game)}
      className="h-8 w-40"
      onValueChange={(next) =>
        startTransition(async () => {
          const result = await updateGameStatus(gameId, next);
          if (result.ok) toast.success(t.games.admin.statusUpdated);
          else toast.error(result.message ?? t.games.actions.statusFailed);
        })
      }
    />
  );
}

/** Remove with confirmation (administrators). Projects keep existing, unlinked. */
export function RemoveGameButton({ gameId, name }: { gameId: string; name: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      size="sm"
      trigger={
        <Button variant="ghost" size="icon" aria-label={t.games.admin.removeLabel(name)}>
          <Trash2 />
        </Button>
      }
      title={t.games.admin.removeTitle}
      description={t.games.admin.removeDescription(name)}
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
                const result = await removeGame(gameId);
                if (result.ok) {
                  toast.success(t.games.admin.removed(name));
                  setOpen(false);
                  router.push("/games");
                } else {
                  toast.error(result.message ?? t.games.actions.removeFailed);
                }
              })
            }
          >
            {t.common.actions.remove}
          </Button>
        </>
      }
    />
  );
}
