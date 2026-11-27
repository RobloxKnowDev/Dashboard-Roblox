"use client";

import { Bookmark, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { generateIdeasNow, saveWeeklyIdea } from "./weekly-actions";

/** Owner: starts a generation (it runs on the server for 1–3 minutes). */
export function GenerateIdeasButton({ label }: { label: string }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await generateIdeasNow();
          if (!result.ok) {
            toast.error(result.message ?? t.ideas.weekly.errors.failed);
            return;
          }
          toast.success(t.ideas.weekly.started);
          router.refresh();
        })
      }
    >
      <Sparkles aria-hidden />
      {label}
    </Button>
  );
}

/** Developers and above: copies the idea into the library. */
export function SaveWeeklyIdeaButton({ ideaId }: { ideaId: string }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={pending}
      disabled={saved}
      onClick={() =>
        startTransition(async () => {
          const result = await saveWeeklyIdea(ideaId);
          if (!result.ok) {
            toast.error(result.message ?? t.ideas.weekly.errors.failed);
            return;
          }
          setSaved(true);
          toast.success(t.ideas.weekly.savedToast);
        })
      }
    >
      <Bookmark aria-hidden />
      {saved ? t.ideas.form.saved : t.ideas.weekly.save}
    </Button>
  );
}
