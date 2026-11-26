"use client";

import { Eye, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { describedBy, Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { addToWatchlist, removeFromWatchlist, updateWatchNotes } from "./actions";

export function AddToWatchlistButton() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(undefined);
      }}
      trigger={
        <Button variant="primary">
          <Eye aria-hidden />
          Watch a game
        </Button>
      }
      title="Watch a game"
      description="Any Roblox experience — a competitor, an inspiration. Its stats are recorded every day."
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await addToWatchlist(value.trim());
            if (result.ok) {
              toast.success(result.message ?? "Added");
              setValue("");
              setOpen(false);
            } else setError(result.fieldErrors?.universeId ?? result.message);
          });
        }}
      >
        <Field htmlFor="watch-universe" label="Universe ID" required error={error} hint="Tip: from Roblox Discover, use the Watch button instead.">
          <Input
            id="watch-universe"
            inputMode="numeric"
            className="font-mono"
            placeholder="10770686826"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={describedBy("watch-universe")}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            Watch
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function NotesEditor({ id, notes, canEdit }: { id: string; notes: string | null; canEdit: boolean }) {
  const [value, setValue] = useState(notes ?? "");
  const [pending, startTransition] = useTransition();
  if (!canEdit) return notes ? <p className="whitespace-pre-line text-xs text-fg-2">{notes}</p> : null;
  const dirty = value !== (notes ?? "");
  return (
    <div className="space-y-2">
      <Textarea
        aria-label="Notes"
        rows={2}
        placeholder="Why are we watching this game?"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-h-0 text-xs"
      />
      {dirty ? (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setValue(notes ?? "")}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await updateWatchNotes(id, value);
                if (result.ok) toast.success(result.message ?? "Saved");
                else toast.error(result.message ?? "Couldn't save the notes.");
              })
            }
          >
            Save notes
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function RemoveWatchButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Stop watching ${name}`}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await removeFromWatchlist(id);
          if (result.ok) toast.success(result.message ?? "Removed");
          else toast.error(result.message ?? "Couldn't remove it.");
        })
      }
    >
      {pending ? null : <Trash2 />}
    </Button>
  );
}
