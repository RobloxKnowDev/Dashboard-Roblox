"use client";

import { ArrowUp, Check, Copy, MessageSquare, Plus, Sparkles, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { SourceBadge } from "@/components/feedback/demo-badge";
import { Button } from "@/components/ui/button";
import type { DataSource } from "@/lib/data/source";
import { cn } from "@/lib/utils/cn";
import { useFormat, useT } from "@/i18n/client";
import { askAssistant, deleteConversation as deleteSaved, loadConversation } from "./actions";
import { Markdown } from "./markdown";
import type { AssistantMode } from "./provider";
import { MAX_HISTORY, MAX_MESSAGE_LENGTH, type ChatMessage } from "./types";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: DataSource;
  /** thinking → streaming → done | stopped | error */
  status: "thinking" | "streaming" | "done" | "stopped" | "error";
};

/** Saved conversations come without messages until opened (loaded: false). */
type Conversation = { id: string; title: string; messages: Message[]; saved: boolean; loaded: boolean };

export type SavedConversation = { id: string; title: string };

/** Reveal speed of an answer (characters per frame of ~16 ms). */
const CHARS_PER_TICK = 4;
const MIN_THINKING_MS = 500;

function CopyMessage({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const t = useT();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={copied ? t.assistant.copied : t.assistant.copy}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}

function ThinkingDots() {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1 py-1.5" role="status" aria-label={t.assistant.thinking}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 animate-pulse rounded-full bg-fg-3" style={{ animationDelay: `${i * 160}ms` }} aria-hidden />
      ))}
    </span>
  );
}

export function AssistantChat({ mode, savedConversations = [] }: { mode: AssistantMode; savedConversations?: SavedConversation[] }) {
  const t = useT();
  const f = useFormat();
  const live = mode === "live";
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    savedConversations.map((c) => ({ ...c, messages: [], saved: true, loaded: false })),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRequested = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const messages = active?.messages ?? [];

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  // Keep the latest message in view.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [active]);

  function patchMessage(conversationId: string, messageId: string, patch: Partial<Message>) {
    setConversations((list) =>
      list.map((c) => (c.id !== conversationId ? c : { ...c, messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)) })),
    );
  }

  /** Opens a conversation, loading its messages the first time. */
  async function open(id: string) {
    if (generating) return;
    setActiveId(id);
    const target = conversations.find((c) => c.id === id);
    if (!target || target.loaded) return;
    const result = await loadConversation(id);
    if (!result.ok || !result.data) {
      toast.error(result.ok ? t.assistant.errors.loadFailed : (result.message ?? t.assistant.errors.loadFailed));
      return;
    }
    const loaded: Message[] = result.data.messages.map((m) => ({
      id: crypto.randomUUID(),
      role: m.role,
      content: m.content,
      status: "done",
      source: m.role === "assistant" ? "live" : undefined,
    }));
    setConversations((list) => list.map((c) => (c.id === id ? { ...c, messages: loaded, loaded: true } : c)));
  }

  function reveal(conversationId: string, messageId: string, full: string, source: DataSource) {
    let shown = 0;
    patchMessage(conversationId, messageId, { status: "streaming", source, content: "" });
    timer.current = setInterval(() => {
      if (stopRequested.current) {
        clearInterval(timer.current!);
        patchMessage(conversationId, messageId, { status: "stopped", content: full.slice(0, shown) });
        setGenerating(false);
        return;
      }
      shown = Math.min(full.length, shown + CHARS_PER_TICK);
      const done = shown >= full.length;
      patchMessage(conversationId, messageId, { content: full.slice(0, shown), status: done ? "done" : "streaming" });
      if (done) {
        clearInterval(timer.current!);
        setGenerating(false);
      }
    }, 16);
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || generating) return;
    if (content.length > MAX_MESSAGE_LENGTH) {
      toast.error(t.assistant.tooLong(f.formatNumber(MAX_MESSAGE_LENGTH)));
      return;
    }

    const localId = activeId ?? crypto.randomUUID();
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content, status: "done" };
    const reply: Message = { id: crypto.randomUUID(), role: "assistant", content: "", status: "thinking" };
    const previous = active?.messages ?? [];

    if (!activeId) {
      const title = content.length > 60 ? `${content.slice(0, 57)}…` : content;
      setConversations((list) => [{ id: localId, title, messages: [userMessage, reply], saved: false, loaded: true }, ...list]);
      setActiveId(localId);
    } else {
      setConversations((list) => {
        const current = list.find((c) => c.id === localId);
        const rest = list.filter((c) => c.id !== localId);
        return current ? [{ ...current, messages: [...current.messages, userMessage, reply] }, ...rest] : list;
      });
    }
    setDraft("");
    setGenerating(true);
    stopRequested.current = false;

    const history: ChatMessage[] = [...previous, userMessage]
      .filter((m) => m.content.trim() && m.status !== "error")
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(-MAX_HISTORY);

    // Keep the thinking indicator visible for a moment, even on a fast answer.
    const savedId = conversations.find((c) => c.id === localId)?.saved ? localId : null;
    const [result] = await Promise.all([
      askAssistant({ conversationId: savedId, history }),
      new Promise((resolve) => setTimeout(resolve, MIN_THINKING_MS)),
    ]);

    // The server saved a new conversation: adopt its id so the next message continues it.
    const newId = result.ok ? (result.data?.conversationId ?? null) : null;
    const conversationId = newId ?? localId;
    if (newId && newId !== localId) {
      setConversations((list) => list.map((c) => (c.id === localId ? { ...c, id: newId, saved: true } : c)));
      setActiveId((current) => (current === localId ? newId : current));
    }

    if (stopRequested.current) {
      patchMessage(conversationId, reply.id, { status: "stopped", content: "" });
      setGenerating(false);
      return;
    }
    if (!result.ok || !result.data) {
      patchMessage(conversationId, reply.id, { status: "error", content: result.ok ? t.assistant.errors.noAnswer : (result.message ?? t.assistant.errors.failed) });
      setGenerating(false);
      return;
    }
    reveal(conversationId, reply.id, result.data.content, result.data.source);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft);
    }
  }

  function newConversation() {
    if (generating) return;
    setActiveId(null);
    setDraft("");
    inputRef.current?.focus();
  }

  async function deleteConversation(id: string) {
    if (generating && id === activeId) return;
    const target = conversations.find((c) => c.id === id);
    if (target?.saved) {
      const result = await deleteSaved(id);
      if (!result.ok) {
        toast.error(result.message ?? t.assistant.errors.deleteFailed);
        return;
      }
    }
    setConversations((list) => list.filter((c) => c.id !== id));
    if (id === activeId) setActiveId(null);
  }

  return (
    <div className="grid h-[calc(100dvh-13rem)] min-h-[440px] overflow-hidden rounded-lg sm:h-[calc(100dvh-15rem)] sm:min-h-[520px] border border-line bg-surface lg:grid-cols-[15rem_1fr]">
      {/* History */}
      <aside className="hidden min-h-0 flex-col border-r border-line lg:flex" aria-label={t.assistant.conversations}>
        <div className="p-3">
          <Button variant="secondary" className="w-full justify-start" onClick={newConversation} disabled={generating}>
            <Plus aria-hidden />
            {t.assistant.newConversation}
          </Button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {conversations.length === 0 ? (
            <p className="px-2 py-3 text-xs leading-relaxed text-fg-3">{t.assistant.emptyHistory}</p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => (
                <li key={c.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => void open(c.id)}
                    aria-current={c.id === activeId ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md py-2 pl-2.5 pr-9 text-left text-[13px] transition-colors",
                      c.id === activeId ? "bg-surface-3 text-fg" : "text-fg-2 hover:bg-surface-2",
                    )}
                  >
                    <MessageSquare className="size-3.5 shrink-0 text-fg-3" aria-hidden />
                    <span className="truncate">{c.title}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
                    aria-label={t.assistant.deleteConversation(c.title)}
                    onClick={() => void deleteConversation(c.id)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </nav>
        <p className="border-t border-line px-3 py-2.5 text-[11px] leading-relaxed text-fg-3">{live ? t.assistant.savedToAccount : t.assistant.demoNotSaved}</p>
      </aside>

      {/* Chat */}
      <section className="flex min-h-0 flex-col" aria-label={t.assistant.conversation}>
        {/* Phones and tablets: the history list is hidden, so switch conversations here. */}
        <div className="flex items-center gap-2 border-b border-line p-2 lg:hidden">
          {conversations.length > 0 ? (
            <>
              <label htmlFor="assistant-conversation" className="sr-only">
                {t.assistant.conversation}
              </label>
              <select
                id="assistant-conversation"
                value={activeId ?? ""}
                disabled={generating}
                onChange={(event) => (event.target.value ? void open(event.target.value) : setActiveId(null))}
                className="h-9 min-w-0 flex-1 truncate rounded-md border border-line-strong bg-surface-2 px-2.5 text-[13px] text-fg focus:border-accent/60 focus:outline-none"
              >
                <option value="">{t.assistant.newConversation}</option>
                {conversations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              {activeId ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t.assistant.deleteThis}
                  disabled={generating}
                  onClick={() => void deleteConversation(activeId)}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </>
          ) : (
            <p className="min-w-0 flex-1 truncate px-1.5 text-xs text-fg-3">{live ? t.assistant.emptyHistory : t.assistant.demoNotSaved}</p>
          )}
          <Button variant="secondary" size="sm" onClick={newConversation} disabled={generating}>
            <Plus aria-hidden />
            {t.assistant.new}
          </Button>
        </div>
        <div ref={logRef} role="log" aria-live="polite" aria-busy={generating} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center">
              <div className="flex size-11 items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-accent">
                <Sparkles className="size-5" aria-hidden />
              </div>
              <h2 className="mt-4 text-base font-semibold text-fg">{t.assistant.emptyTitle}</h2>
              <p className="mt-1 text-[13px] text-fg-3">{t.assistant.emptyBody}</p>
              <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                {t.assistant.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-lg border border-line bg-surface-2/50 px-3.5 py-3 text-left text-[13px] text-fg-2 transition-colors hover:border-line-strong hover:text-fg"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ol className="mx-auto max-w-3xl space-y-6">
              {messages.map((m) =>
                m.role === "user" ? (
                  <li key={m.id} className="flex justify-end">
                    <p className="max-w-[85%] whitespace-pre-wrap rounded-lg rounded-br-sm bg-surface-3 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-fg">
                      {m.content}
                    </p>
                  </li>
                ) : (
                  <li key={m.id} className="flex gap-3">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-line-strong bg-surface-2 text-accent">
                      <Sparkles className="size-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-medium text-fg-2">{t.assistant.assistantName}</span>
                        {m.source ? <SourceBadge source={m.source} /> : null}
                      </div>
                      {m.status === "thinking" ? (
                        <ThinkingDots />
                      ) : m.status === "error" ? (
                        <p className="text-[13px] text-critical">{m.content}</p>
                      ) : (
                        <>
                          <Markdown source={m.content} />
                          {m.status === "streaming" ? <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-accent align-middle" aria-hidden /> : null}
                          {m.status === "stopped" ? <p className="mt-2 text-xs text-fg-3">{t.assistant.stopped}</p> : null}
                          {(m.status === "done" || m.status === "stopped") && m.content ? (
                            <div className="mt-1.5 -ml-1.5">
                              <CopyMessage text={m.content} />
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </li>
                ),
              )}
            </ol>
          )}
        </div>

        <form
          className="border-t border-line p-3 sm:px-8 sm:py-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-lg border border-line-strong bg-surface-2 p-2 focus-within:border-accent/60">
            <label htmlFor="assistant-input" className="sr-only">
              {t.assistant.inputLabel}
            </label>
            <textarea
              id="assistant-input"
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t.assistant.placeholder}
              className="field-sizing-content max-h-48 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-[13.5px] text-fg placeholder:text-fg-4 focus:outline-none"
            />
            {generating ? (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label={t.assistant.stop}
                onClick={() => {
                  stopRequested.current = true;
                }}
              >
                <Square className="fill-current" />
              </Button>
            ) : (
              <Button type="submit" variant="primary" size="icon" aria-label={t.assistant.send} disabled={!draft.trim()}>
                <ArrowUp />
              </Button>
            )}
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-fg-3 pointer-coarse:hidden">{t.assistant.keyboardHint}</p>
        </form>
      </section>
    </div>
  );
}
