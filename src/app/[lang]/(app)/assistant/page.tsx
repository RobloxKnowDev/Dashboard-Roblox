import { Info, CirclePause } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { DemoBanner } from "@/components/feedback/demo-badge";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/primitives";
import { AssistantChat, type SavedConversation } from "@/features/assistant/chat";
import { getAssistantMode, type AssistantMode } from "@/features/assistant/provider";
import { getT } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.nav.items.assistant.title };
}

async function ModeNotice({ mode }: { mode: AssistantMode }) {
  const t = await getT();
  if (mode === "demo") return <DemoBanner>{t.assistant.demoBanner}</DemoBanner>;
  if (mode === "live") {
    return (
      <p className="flex items-start gap-2 text-xs text-fg-3">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden />
        <span>{t.assistant.liveNote}</span>
      </p>
    );
  }
  return (
    <p role="status" className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-warning">
      <CirclePause className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{mode === "disabled" ? t.assistant.disabledBanner : t.assistant.budgetBanner}</span>
    </p>
  );
}

/** Reads the user's saved conversations (session → under Suspense). */
async function Chat() {
  await connection();
  const mode = await getAssistantMode(new Date());
  let saved: SavedConversation[] = [];
  if (mode !== "demo") {
    const supabase = await createClient();
    const { data } = await supabase.from("assistant_conversations").select("id, title").order("updated_at", { ascending: false }).limit(50);
    saved = data ?? [];
  }
  return (
    <div className="space-y-4">
      <ModeNotice mode={mode} />
      <AssistantChat mode={mode} savedConversations={saved} />
    </div>
  );
}

export default async function AssistantPage() {
  const t = await getT();
  return (
    <PageContainer>
      <PageHeader title={t.nav.items.assistant.title} eyebrow={t.assistant.eyebrow} description={t.assistant.description} />
      <Suspense fallback={<Skeleton className="h-[calc(100dvh-15rem)] min-h-[440px] rounded-lg" />}>
        <Chat />
      </Suspense>
    </PageContainer>
  );
}
