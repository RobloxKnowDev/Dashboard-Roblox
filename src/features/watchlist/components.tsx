"use client";

import { Eye, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { describedBy, Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useT } from "@/i18n/client";
import { addToWatchlist, removeFromWatchlist, updateWatchNotes } from "./actions";

export function AddToWatchlistButton() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const t = useT();
  const l = t.discover.watchlist.add;

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
          {l.trigger}
        </Button>
      }
      title={l.title}
      description={l.description}
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await addToWatchlist(value.trim());
            if (result.ok) {
              toast.success(result.message ?? l.added);
              setValue("");
              setOpen(false);
            } else setError(result.fieldErrors?.universeId ?? result.message);
          });
        }}
      >
        <Field htmlFor="watch-universe" label={l.universeId} required error={error} hint={l.hint}>
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
            {t.common.actions.cancel}
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            {l.submit}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function NotesEditor({ id, notes, canEdit }: { id: string; notes: string | null; canEdit: boolean }) {
  const [value, setValue] = useState(notes ?? "");
  const [pending, startTransition] = useTransition();
  const t = useT();
  const l = t.discover.watchlist.notes;
  if (!canEdit) return notes ? <p className="whitespace-pre-line text-xs text-fg-2">{notes}</p> : null;
  const dirty = value !== (notes ?? "");
  return (
    <div className="space-y-2">
      <Textarea
        aria-label={l.label}
        rows={2}
        placeholder={l.placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-h-0 text-xs"
      />
      {dirty ? (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setValue(notes ?? "")}>
            {t.common.actions.cancel}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await updateWatchNotes(id, value);
                if (result.ok) toast.success(result.message ?? l.saved);
                else toast.error(result.message ?? l.failed);
              })
            }
          >
            {l.save}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function RemoveWatchButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const l = useT().discover.watchlist.remove;
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={l.label(name)}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await removeFromWatchlist(id);
          if (result.ok) toast.success(result.message ?? l.removed);
          else toast.error(result.message ?? l.failed);
        })
      }
    >
      {pending ? null : <Trash2 />}
    </Button>
  );
}
