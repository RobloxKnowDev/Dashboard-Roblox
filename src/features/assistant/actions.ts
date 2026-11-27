"use server";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getRequestLocale } from "@/i18n/server";
import { messages as dictionaries } from "@/i18n/messages";
import type { ActionResult } from "@/lib/action-result";
import { checkAccess } from "@/lib/auth/session";
import type { DataSource } from "@/lib/data/source";
import { createClient } from "@/lib/supabase/server";
import { claudeAnswer } from "./claude";
import { demoReply } from "./demo";
import { getAssistantMode } from "./provider";
import { chatHistorySchema, type ChatMessage } from "./types";

const askSchema = z.object({ conversationId: z.uuid().nullable(), history: chatHistorySchema });

/**
 * Answers the last user message. With Claude, the exchange is saved in the
 * user's own conversation (RLS: assistant_* rows are private to each user);
 * demo answers are never stored.
 */
export async function askAssistant(input: unknown): Promise<ActionResult<{ content: string; source: DataSource; conversationId: string | null }>> {
  const locale = await getRequestLocale();
  const t = dictionaries[locale].assistant.errors;
  const access = await checkAccess("viewer");
  if (access.status !== "allowed") return { ok: false, message: t.noAccess };
  const parsed = askSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: t.invalid };
  const { history } = parsed.data;
  const question = history.at(-1);
  if (!question || question.role !== "user") return { ok: false, message: t.invalid };

  const now = new Date();
  const mode = await getAssistantMode(now);
  if (mode === "demo") return { ok: true, data: { content: demoReply(question.content), source: "demo", conversationId: null } };
  if (mode === "disabled") return { ok: false, message: t.disabled };
  if (mode === "budget") return { ok: false, message: t.budget };

  let answer: string;
  try {
    const result = await claudeAnswer(history, access.user, locale, now.toISOString().slice(0, 10));
    answer = result.content;
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError) return { ok: false, message: t.rateLimited };
    console.warn("[assistant] Claude request failed:", error instanceof Error ? error.message : error);
    return { ok: false, message: t.failed };
  }
  if (!answer) return { ok: false, message: t.refused };

  // Save the exchange (failure to save never hides the answer).
  const conversationId = await saveExchange(parsed.data.conversationId, question, answer);
  return { ok: true, data: { content: answer, source: "live", conversationId } };
}

async function saveExchange(conversationId: string | null, question: ChatMessage, answer: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    let id = conversationId;
    if (!id) {
      const title = question.content.length > 80 ? `${question.content.slice(0, 77)}…` : question.content;
      const { data, error } = await supabase.from("assistant_conversations").insert({ title }).select("id").single();
      if (error) throw error;
      id = data.id;
    }
    const { error } = await supabase.from("assistant_messages").insert([
      { conversation_id: id, role: "user", content: question.content },
      { conversation_id: id, role: "assistant", content: answer },
    ]);
    if (error) throw error;
    return id;
  } catch (error) {
    console.warn("[assistant] couldn't save the conversation:", error instanceof Error ? error.message : error);
    return conversationId;
  }
}

/** Messages of one of the user's conversations (RLS keeps others out). */
export async function loadConversation(conversationId: string): Promise<ActionResult<{ messages: ChatMessage[] }>> {
  const t = dictionaries[await getRequestLocale()].assistant.errors;
  if (!z.uuid().safeParse(conversationId).success) return { ok: false, message: t.loadFailed };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assistant_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return { ok: false, message: t.loadFailed };
  return { ok: true, data: { messages: data.map((m) => ({ role: m.role, content: m.content })) } };
}

export async function deleteConversation(conversationId: string): Promise<ActionResult> {
  const t = dictionaries[await getRequestLocale()].assistant.errors;
  if (!z.uuid().safeParse(conversationId).success) return { ok: false, message: t.deleteFailed };
  const supabase = await createClient();
  const { error } = await supabase.from("assistant_conversations").delete().eq("id", conversationId);
  return error ? { ok: false, message: t.deleteFailed } : { ok: true };
}
