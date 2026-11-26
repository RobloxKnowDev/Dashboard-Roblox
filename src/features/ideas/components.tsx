"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, ArchiveRestore, Ellipsis, Lightbulb, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EmptyState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { describedBy, Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { deleteIdea, saveIdea, setIdeaArchived } from "./actions";
import { emptyIdea, ideaSchema, type IdeaInput } from "./schemas";

export type IdeaRow = {
  id: string;
  title: string;
  pitch: string | null;
  genre: string | null;
  targetAudience: string | null;
  coreLoop: string | null;
  monetization: string | null;
  score: number | null;
  status: "suggested" | "saved" | "archived";
  createdBy: string | null;
  createdAt: string;
};

function IdeaFormModal({ open, onOpenChange, idea }: { open: boolean; onOpenChange: (open: boolean) => void; idea?: IdeaRow }) {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState, setError, reset } = useForm<IdeaInput>({ resolver: zodResolver(ideaSchema), defaultValues: emptyIdea });
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    reset(
      idea
        ? {
            title: idea.title,
            pitch: idea.pitch ?? "",
            genre: idea.genre ?? "",
            targetAudience: idea.targetAudience ?? "",
            coreLoop: idea.coreLoop ?? "",
            monetization: idea.monetization ?? "",
            score: idea.score === null ? "" : String(Math.round(idea.score)),
          }
        : emptyIdea,
    );
  }, [open, idea, reset]);

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const result = await saveIdea(values, idea?.id);
      if (result.ok) {
        toast.success(result.message ?? "Saved");
        onOpenChange(false);
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) setError(field as keyof IdeaInput, { message });
      if (result.message) toast.error(result.message);
    }),
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="lg" title={idea ? "Edit idea" : "New idea"} description="Capture a game concept for the library.">
      <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="i-title" label="Title" required error={errors.title?.message} className="sm:col-span-2">
          <Input id="i-title" autoFocus aria-invalid={!!errors.title} aria-describedby={describedBy("i-title")} {...register("title")} />
        </Field>
        <Field htmlFor="i-pitch" label="Pitch" error={errors.pitch?.message} className="sm:col-span-2">
          <Textarea id="i-pitch" rows={2} placeholder="The game in one or two sentences" {...register("pitch")} />
        </Field>
        <Field htmlFor="i-genre" label="Genre" error={errors.genre?.message}>
          <Input id="i-genre" placeholder="Tycoon, Obby, Horror…" {...register("genre")} />
        </Field>
        <Field htmlFor="i-score" label="Score (0–100)" error={errors.score?.message} hint="Your gut feeling about its potential.">
          <Input id="i-score" inputMode="numeric" aria-invalid={!!errors.score} {...register("score")} />
        </Field>
        <Field htmlFor="i-audience" label="Target audience" error={errors.targetAudience?.message} className="sm:col-span-2">
          <Input id="i-audience" placeholder="Age range, play style…" {...register("targetAudience")} />
        </Field>
        <Field htmlFor="i-loop" label="Core loop" error={errors.coreLoop?.message}>
          <Textarea id="i-loop" rows={3} placeholder="What players do again and again" {...register("coreLoop")} />
        </Field>
        <Field htmlFor="i-money" label="Monetization" error={errors.monetization?.message}>
          <Textarea id="i-money" rows={3} placeholder="Game passes, products…" {...register("monetization")} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-4 sm:col-span-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            {idea ? "Save changes" : "Save idea"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const VIEWS = [
  { value: "saved", label: "Library" },
  { value: "archived", label: "Archived" },
] as const;

export function IdeasLibrary({ ideas, canEdit, canDeleteAny, userId }: { ideas: IdeaRow[]; canEdit: boolean; canDeleteAny: boolean; userId: string }) {
  const [view, setView] = useState<"saved" | "archived">("saved");
  const [editing, setEditing] = useState<IdeaRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [, startTransition] = useTransition();
  const visible = useMemo(() => ideas.filter((i) => (view === "archived" ? i.status === "archived" : i.status !== "archived")), [ideas, view]);

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message ?? "Done");
      else toast.error(result.message ?? "Something went wrong.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl value={view} onValueChange={setView} options={VIEWS} aria-label="Ideas view" />
        {canEdit ? (
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            New idea
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            icon={Lightbulb}
            title={view === "archived" ? "No archived ideas" : "The library is empty"}
            description={view === "archived" ? "Archived ideas show up here." : "Write down game concepts as they come — pitch, loop, monetization."}
          />
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((idea) => {
            const canDelete = canDeleteAny || (canEdit && idea.createdBy === userId);
            return (
              <li key={idea.id} className={cn("flex flex-col gap-3 rounded-lg border border-line bg-surface p-4", idea.status === "archived" && "opacity-70")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-fg">{idea.title}</h3>
                    <p className="mt-0.5 text-xs text-fg-3">
                      {[idea.genre, `Added ${formatDate(idea.createdAt)}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {idea.score !== null ? <Badge tone="accent">{Math.round(idea.score)}</Badge> : null}
                    {canEdit ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${idea.title}`}>
                            <Ellipsis />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => setEditing(idea)}>
                            <Pencil aria-hidden />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => run(() => setIdeaArchived(idea.id, idea.status !== "archived"))}>
                            {idea.status === "archived" ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
                            {idea.status === "archived" ? "Restore" : "Archive"}
                          </DropdownMenuItem>
                          {canDelete ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem destructive onSelect={() => run(() => deleteIdea(idea.id))}>
                                <Trash2 aria-hidden />
                                Delete
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </div>
                {idea.pitch ? <p className="text-[13px] leading-relaxed text-fg-2">{idea.pitch}</p> : null}
                <dl className="mt-auto space-y-1.5 text-xs">
                  {[
                    ["Audience", idea.targetAudience],
                    ["Core loop", idea.coreLoop],
                    ["Monetization", idea.monetization],
                  ]
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div key={label}>
                        <dt className="inline font-medium text-fg-3">{label}: </dt>
                        <dd className="inline text-fg-2">{value}</dd>
                      </div>
                    ))}
                </dl>
              </li>
            );
          })}
        </ul>
      )}

      <IdeaFormModal open={creating} onOpenChange={setCreating} />
      <IdeaFormModal open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} idea={editing ?? undefined} />
    </div>
  );
}
