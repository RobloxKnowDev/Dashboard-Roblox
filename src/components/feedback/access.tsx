import { Hourglass, LockKeyhole, LogOut } from "lucide-react";
import Link from "next/link";
import { Button, buttonStyles } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { ROLE_LABELS, type AppRole } from "@/lib/auth/roles";

/** Shown to an account that can sign in but has no role yet. */
export function PendingAccess({ email }: { email: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border border-warning/25 bg-warning/10 text-warning">
        <Hourglass className="size-5" aria-hidden />
      </div>
      <h1 className="mt-5 font-display text-xl font-semibold tracking-tight text-fg">Access pending</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-fg-3">
        You&apos;re signed in as <span className="text-fg-2">{email}</span>, but no role has been assigned to your
        account yet. An owner needs to approve your access before you can see studio data.
      </p>
      <form action={signOut} className="mt-6">
        <Button type="submit" variant="secondary">
          <LogOut aria-hidden />
          Sign out
        </Button>
      </form>
    </div>
  );
}

/** Shown when the user's role is below what the page requires. */
export function AccessDenied({ required, role }: { required: AppRole; role: AppRole }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-surface px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-fg-3">
        <LockKeyhole className="size-5" aria-hidden />
      </div>
      <p className="mt-4 text-sm font-medium text-fg">You don&apos;t have access to this section</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-fg-3">
        It requires the {ROLE_LABELS[required]} role or above. Your role is {ROLE_LABELS[role]}. Ask an owner if you need
        access.
      </p>
      <Link href="/overview" className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-5" })}>
        Back to overview
      </Link>
    </div>
  );
}
