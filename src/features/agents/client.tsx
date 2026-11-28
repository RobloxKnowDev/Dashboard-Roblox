"use client";

import { Gamepad2, ImagePlus, LoaderCircle, Plus, Send, Square, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, describedBy } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useT } from "@/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { cancelAgentMessage, deleteAgent, sendAgentMessage, startGame, startMission, stopAgent } from "./actions";
import { MAX_MESSAGE_IMAGES } from "./ingest";
import { MISSION_ROLES } from "./roles";

type MissionRole = (typeof MISSION_ROLES)[number];

/** Re-renders the page's server data every few seconds while the tab is visible. */
export function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [router, intervalMs]);
  return null;
}

type Attachment = { id: string; preview: string; path: string | null; state: "uploading" | "ready" | "error" };

const IMAGE_EXT: Record<string, "png" | "jpg" | "webp"> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** The pilot's message box at the bottom of an agent's conversation: text and up to 4 images. */
export function MessageComposer({ agentId, hint }: { agentId: string; hint: string }) {
  const t = useT();
  const c = t.agents.composer;
  const router = useRouter();
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [images, setImages] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  // Free the previews when the composer goes away.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const addFiles = (files: File[]) => {
    const room = MAX_MESSAGE_IMAGES - images.length;
    if (files.length > room) toast.error(c.tooMany(MAX_MESSAGE_IMAGES));
    for (const file of files.slice(0, Math.max(0, room))) {
      const ext = IMAGE_EXT[file.type];
      if (!ext) {
        toast.error(c.badType);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(c.tooLarge);
        continue;
      }
      const item: Attachment = { id: crypto.randomUUID(), preview: URL.createObjectURL(file), path: null, state: "uploading" };
      previews.current.add(item.preview);
      setImages((list) => [...list, item]);
      // Straight to the private bucket (Owners only, RLS); the server checks it's there when sending.
      const path = `messages/${agentId}/${crypto.randomUUID()}.${ext}`;
      void createClient()
        .storage.from("agent-media")
        .upload(path, file, { contentType: file.type, upsert: false })
        .then(({ error }) => {
          if (error) toast.error(c.uploadFailed);
          setImages((list) => list.map((x) => (x.id === item.id ? { ...x, path: error ? null : path, state: error ? "error" : "ready" } : x)));
        });
    }
  };

  const remove = (item: Attachment) => {
    URL.revokeObjectURL(item.preview);
    previews.current.delete(item.preview);
    setImages((list) => list.filter((x) => x.id !== item.id));
  };

  const uploading = images.some((x) => x.state === "uploading");
  const ready = images.filter((x) => x.state === "ready" && x.path).map((x) => x.path!);
  const canSend = !pending && !uploading && (body.trim().length > 0 || ready.length > 0);

  const send = () => {
    if (!canSend) return;
    const text = body.trim();
    startTransition(async () => {
      const result = await sendAgentMessage(agentId, text, ready);
      if (!result.ok) {
        toast.error(result.message ?? t.agents.errors.failed);
        return;
      }
      setBody("");
      images.forEach((item) => {
        URL.revokeObjectURL(item.preview);
        previews.current.delete(item.preview);
      });
      setImages([]);
      toast.success(c.sent);
      router.refresh();
    });
  };

  return (
    <form
      className={cn("space-y-2 rounded-lg", dragging && "outline-2 outline-offset-4 outline-dashed outline-accent")}
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        addFiles([...event.dataTransfer.files]);
      }}
    >
      <label htmlFor={id} className="sr-only">
        {c.label}
      </label>
      <Textarea
        id={id}
        rows={3}
        value={body}
        maxLength={8000}
        placeholder={c.placeholder}
        aria-describedby={`${id}-hint`}
        onChange={(event) => setBody(event.target.value)}
        onPaste={(event) => {
          const files = [...event.clipboardData.files].filter((file) => file.type.startsWith("image/"));
          if (files.length) {
            event.preventDefault();
            addFiles(files);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            send();
          }
        }}
      />
      {images.length ? (
        <ul className="flex flex-wrap gap-2" aria-label={c.attached}>
          {images.map((item, index) => (
            <li key={item.id} className="relative">
              {/* Local preview (object URL) of the file being sent. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.preview}
                alt={c.imageAlt(index + 1)}
                className={cn(
                  "size-20 rounded-md border object-cover",
                  item.state === "error" ? "border-critical/60 opacity-60" : "border-line-strong",
                  item.state === "uploading" && "opacity-60",
                )}
              />
              {item.state === "uploading" ? (
                <LoaderCircle className="absolute inset-0 m-auto size-5 animate-spin text-fg" aria-label={c.uploading} />
              ) : null}
              <button
                type="button"
                onClick={() => remove(item)}
                aria-label={c.removeImage(index + 1)}
                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border border-line-strong bg-surface-3 text-fg-2 hover:text-fg"
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={`${id}-hint`} className="text-xs text-fg-3">
          {hint} <span className="hidden sm:inline">· {c.shortcut}</span>
        </p>
        <div className="flex items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              addFiles([...(event.target.files ?? [])]);
              event.target.value = "";
            }}
          />
          <Button type="button" size="sm" variant="outline" disabled={images.length >= MAX_MESSAGE_IMAGES} onClick={() => fileInput.current?.click()}>
            <ImagePlus aria-hidden />
            {c.attach}
          </Button>
          <Button type="submit" size="sm" loading={pending} disabled={!canSend}>
            <Send aria-hidden />
            {c.send}
          </Button>
        </div>
      </div>
    </form>
  );
}

/** Deletes a useless agent (and a manager's team) after a confirmation. */
export function DeleteAgentButton({
  agentId,
  name,
  teamSize = 0,
  working,
  compact = false,
  afterDelete = "refresh",
}: {
  agentId: string;
  name: string;
  teamSize?: number;
  working: boolean;
  compact?: boolean;
  afterDelete?: "refresh" | "list";
}) {
  const t = useT();
  const d = t.agents.delete;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const trigger = compact ? (
    <button
      type="button"
      aria-label={d.labelFor(name)}
      className="flex size-7 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-critical/10 hover:text-critical"
    >
      <Trash2 className="size-3.5" aria-hidden />
    </button>
  ) : (
    <Button size="sm" variant="outline">
      <Trash2 aria-hidden />
      {d.label}
    </Button>
  );
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={d.title(name)}
      description={working ? d.working : d.description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {t.common.actions.cancel}
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={pending}
            disabled={working}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteAgent(agentId);
                if (!result.ok) {
                  toast.error(result.message ?? t.agents.errors.failed);
                  return;
                }
                setOpen(false);
                toast.success(d.done(result.data?.deleted ?? 1));
                if (afterDelete === "list") router.push("/agents");
                else router.refresh();
              })
            }
          >
            <Trash2 aria-hidden />
            {d.confirm}
          </Button>
        </>
      }
    >
      {teamSize > 0 && !working ? <p className="text-[13px] text-fg-2">{d.withTeam(teamSize)}</p> : null}
    </Modal>
  );
}

export function CancelMessageButton({ messageId }: { messageId: string }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await cancelAgentMessage(messageId);
          if (!result.ok) toast.error(result.message ?? t.agents.errors.failed);
          else toast.success(t.agents.composer.cancelled);
          router.refresh();
        })
      }
    >
      <X aria-hidden />
      {t.agents.timeline.cancel}
    </Button>
  );
}

export function StopAgentButton({ agentId, requested }: { agentId: string; requested: boolean }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="danger"
      loading={pending}
      disabled={requested}
      onClick={() =>
        startTransition(async () => {
          const result = await stopAgent(agentId);
          if (!result.ok) toast.error(result.message ?? t.agents.errors.failed);
          else toast.success(t.agents.stop.done);
          router.refresh();
        })
      }
    >
      <Square aria-hidden />
      {requested ? t.agents.stop.requested : t.agents.stop.label}
    </Button>
  );
}

/** Controller: starts a mission run by the PC's bridge. */
export function NewMissionButton({ folders }: { folders: string[] }) {
  const t = useT();
  const m = t.agents.mission;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cwd, setCwd] = useState(folders[0] ?? "");
  const [role, setRole] = useState<MissionRole>("general");
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ids = { cwd: useId(), role: useId(), instruction: useId() };

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const result = await startMission({ cwd, role, instruction });
      if (!result.ok) {
        setError(result.message ?? t.agents.errors.failed);
        return;
      }
      toast.success(m.started);
      setOpen(false);
      setInstruction("");
      if (result.data) router.push(`/agents/${result.data.agentId}`);
    });

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      size="lg"
      title={m.title}
      description={m.description}
      trigger={
        <Button size="sm">
          <Plus aria-hidden />
          {t.agents.page.newMission}
        </Button>
      }
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {m.cancel}
          </Button>
          <Button size="sm" loading={pending} disabled={!cwd.trim() || instruction.trim().length < 3} onClick={submit}>
            {m.start}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field htmlFor={ids.cwd} label={m.folder} hint={m.folderHint} required>
          <Input id={ids.cwd} value={cwd} onChange={(event) => setCwd(event.target.value)} list={`${ids.cwd}-list`} aria-describedby={describedBy(ids.cwd)} spellCheck={false} autoComplete="off" />
          <datalist id={`${ids.cwd}-list`}>
            {folders.map((folder) => (
              <option key={folder} value={folder} />
            ))}
          </datalist>
        </Field>
        {folders.length > 1 ? (
          <div className="-mt-2 flex flex-wrap items-center gap-1.5 text-xs text-fg-3">
            <span>{m.recentFolders}</span>
            {folders.slice(0, 6).map((folder) => (
              <button
                key={folder}
                type="button"
                onClick={() => setCwd(folder)}
                className="rounded-xs border border-line px-1.5 py-0.5 text-fg-2 transition-colors hover:border-line-strong hover:text-fg"
              >
                {folder.split(/[\\/]/).filter(Boolean).at(-1)}
              </button>
            ))}
          </div>
        ) : null}
        <Field htmlFor={ids.role} label={m.role} hint={t.agents.roles[role].description}>
          <Select
            id={ids.role}
            value={role}
            onValueChange={(value) => setRole(value as MissionRole)}
            options={MISSION_ROLES.map((value) => ({ value, label: t.agents.roles[value].label }))}
            aria-describedby={describedBy(ids.role)}
          />
        </Field>
        <Field htmlFor={ids.instruction} label={m.instruction} error={error ?? undefined} required>
          <Textarea
            id={ids.instruction}
            rows={6}
            value={instruction}
            maxLength={8000}
            placeholder={m.instructionPlaceholder}
            onChange={(event) => setInstruction(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy(ids.instruction)}
          />
        </Field>
      </form>
    </Modal>
  );
}

/** Controller: a new game — its manager agent sets up the project and the team. */
export function NewGameButton() {
  const t = useT();
  const g = t.agents.newGame;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [idea, setIdea] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ids = { name: useId(), idea: useId() };

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const result = await startGame({ name, idea });
      if (!result.ok) {
        setError(result.message ?? t.agents.errors.failed);
        return;
      }
      toast.success(g.started);
      setOpen(false);
      setName("");
      setIdea("");
      if (result.data) router.push(`/agents/${result.data.agentId}`);
    });

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      size="lg"
      title={g.title}
      description={g.description}
      trigger={
        <Button size="sm">
          <Gamepad2 aria-hidden />
          {g.button}
        </Button>
      }
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {g.cancel}
          </Button>
          <Button size="sm" loading={pending} disabled={name.trim().length < 2 || idea.trim().length < 10} onClick={submit}>
            {g.start}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field htmlFor={ids.name} label={g.name} required>
          <Input id={ids.name} value={name} maxLength={60} placeholder={g.namePlaceholder} onChange={(event) => setName(event.target.value)} autoComplete="off" />
        </Field>
        <Field htmlFor={ids.idea} label={g.idea} error={error ?? undefined} required>
          <Textarea
            id={ids.idea}
            rows={7}
            value={idea}
            maxLength={4000}
            placeholder={g.ideaPlaceholder}
            onChange={(event) => setIdea(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy(ids.idea)}
          />
        </Field>
      </form>
    </Modal>
  );
}
