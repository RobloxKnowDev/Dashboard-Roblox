"use client";

import { Plus, Send, Square, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, describedBy } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useT } from "@/i18n/client";
import { cancelAgentMessage, sendAgentMessage, startMission, stopAgent } from "./actions";
import { AGENT_ROLES, type AgentRole } from "./roles";

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

/** The controller's message box at the bottom of an agent's conversation. */
export function MessageComposer({ agentId, hint }: { agentId: string; hint: string }) {
  const t = useT();
  const router = useRouter();
  const id = useId();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const send = () => {
    const text = body.trim();
    if (!text || pending) return;
    startTransition(async () => {
      const result = await sendAgentMessage(agentId, text);
      if (!result.ok) {
        toast.error(result.message ?? t.agents.errors.failed);
        return;
      }
      setBody("");
      toast.success(t.agents.composer.sent);
      router.refresh();
    });
  };

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <label htmlFor={id} className="sr-only">
        {t.agents.composer.label}
      </label>
      <Textarea
        id={id}
        rows={3}
        value={body}
        maxLength={8000}
        placeholder={t.agents.composer.placeholder}
        aria-describedby={`${id}-hint`}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            send();
          }
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={`${id}-hint`} className="text-xs text-fg-3">
          {hint} <span className="hidden sm:inline">· {t.agents.composer.shortcut}</span>
        </p>
        <Button type="submit" size="sm" loading={pending} disabled={!body.trim()}>
          <Send aria-hidden />
          {t.agents.composer.send}
        </Button>
      </div>
    </form>
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
  const [role, setRole] = useState<AgentRole>("general");
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
            onValueChange={(value) => setRole(value as AgentRole)}
            options={AGENT_ROLES.map((value) => ({ value, label: t.agents.roles[value].label }))}
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
