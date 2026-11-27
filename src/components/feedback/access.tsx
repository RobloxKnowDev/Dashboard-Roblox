import { Hourglass, LockKeyhole, LogOut } from "lucide-react";
import Link from "next/link";
import { Button, buttonStyles } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { getT } from "@/i18n/server";
import type { AppRole } from "@/lib/auth/roles";

/** Shown to an account that can sign in but has no role yet. */
export async function PendingAccess({ email }: { email: string }) {
  const t = await getT();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border border-warning/25 bg-warning/10 text-warning">
        <Hourglass className="size-5" aria-hidden />
      </div>
      <h1 className="mt-5 font-display text-xl font-semibold tracking-tight text-fg">{t.shell.access.pendingTitle}</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-fg-3">{t.shell.access.pendingBody(email)}</p>
      <form action={signOut} className="mt-6">
        <Button type="submit" variant="secondary">
          <LogOut aria-hidden />
          {t.shell.userMenu.signOut}
        </Button>
      </form>
    </div>
  );
}

/** Shown when the user's role is below what the page requires. */
export async function AccessDenied({ required, role }: { required: AppRole; role: AppRole }) {
  const t = await getT();
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-surface px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-fg-3">
        <LockKeyhole className="size-5" aria-hidden />
      </div>
      <p className="mt-4 text-sm font-medium text-fg">{t.shell.access.deniedTitle}</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-fg-3">
        {t.shell.access.deniedBody(t.common.roles[required], t.common.roles[role])}
      </p>
      <Link href="/overview" className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-5" })}>
        {t.shell.access.backToOverview}
      </Link>
    </div>
  );
}
