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
import { addGame, removeGame, updateGameStatus } from "./actions";

const STATUS_OPTIONS = statusOptions(GAME_STATUS);

/** "Add game" button + modal (administrators). */
export function AddGameButton() {
  const [open, setOpen] = useState(false);
  const [universeId, setUniverseId] = useState("");
  const [state, formAction, pending] = useActionState(async (previous: FormState, formData: FormData) => {
    const result = await addGame(previous, formData);
    if (result.status === "success") {
      toast.success(result.message ?? "Game added");
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
          Add game
        </Button>
      }
      title="Add a game"
      description="Enter the experience's Universe ID. Name, icon and genre are filled in from Roblox."
    >
      <form action={formAction} className="space-y-4" noValidate>
        {state.status === "error" && state.message ? (
          <p role="alert" className="rounded-md border border-critical/25 bg-critical/10 px-3 py-2 text-[13px] text-critical">
            {state.message}
          </p>
        ) : null}
        <Field
          htmlFor="universeId"
          label="Universe ID"
          required
          error={errors.universeId}
          hint="Creator Hub → your experience → overview page."
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
        <Field htmlFor="status" label="Status">
          <Select id="status" name="status" defaultValue="live" options={STATUS_OPTIONS} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            {pending ? "Adding…" : "Add game"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Inline status selector (administrators). */
export function GameStatusSelect({ gameId, status }: { gameId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      aria-label="Game status"
      value={status}
      disabled={pending}
      options={STATUS_OPTIONS}
      className="h-8 w-40"
      onValueChange={(next) =>
        startTransition(async () => {
          const result = await updateGameStatus(gameId, next);
          if (result.ok) toast.success("Status updated");
          else toast.error(result.message ?? "The status couldn't be updated.");
        })
      }
    />
  );
}

/** Remove with confirmation (administrators). Projects keep existing, unlinked. */
export function RemoveGameButton({ gameId, name }: { gameId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      size="sm"
      trigger={
        <Button variant="ghost" size="icon" aria-label={`Remove ${name}`}>
          <Trash2 />
        </Button>
      }
      title="Remove this game?"
      description={`${name} will be removed from the dashboard. Nothing changes on Roblox, and linked projects are kept.`}
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
                const result = await removeGame(gameId);
                if (result.ok) {
                  toast.success(`${name} removed`);
                  setOpen(false);
                  router.push("/games");
                } else {
                  toast.error(result.message ?? "The game couldn't be removed.");
                }
              })
            }
          >
            Remove
          </Button>
        </>
      }
    />
  );
}
