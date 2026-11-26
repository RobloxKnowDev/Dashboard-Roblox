"use client";

import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, type AppRole } from "@/lib/auth/roles";

export type CurrentUser = {
  name: string;
  email: string;
  avatarUrl?: string | null;
  /** null = pending approval. */
  role: AppRole | null;
};

type UserMenuProps = {
  user: CurrentUser | null;
  /** Server action that signs the user out. */
  signOut?: () => Promise<void>;
};

export function UserMenu({ user, signOut }: UserMenuProps) {
  if (!user) {
    return (
      <Badge tone="neutral" className="h-6 px-2">
        Not signed in
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-md py-1 pl-1 pr-1.5 transition-colors hover:bg-surface-2 data-[state=open]:bg-surface-2"
        aria-label="Account menu"
      >
        <Avatar name={user.name} src={user.avatarUrl} size="sm" />
        <span className="hidden max-w-32 truncate text-[13px] font-medium text-fg-2 md:block">{user.name}</span>
        <ChevronDown className="hidden size-3.5 text-fg-3 md:block" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        <DropdownMenuLabel className="flex items-center gap-2.5 px-2 py-2">
          <Avatar name={user.name} src={user.avatarUrl} size="md" />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-fg">{user.name}</span>
            <span className="block truncate text-xs font-normal text-fg-3">{user.email}</span>
          </span>
        </DropdownMenuLabel>
        <div className="px-2 pb-2">
          {user.role ? <Badge tone="accent">{ROLE_LABELS[user.role]}</Badge> : <Badge tone="warning">Pending approval</Badge>}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile">
            <User aria-hidden /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings aria-hidden /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => void signOut?.()} disabled={!signOut}>
          <LogOut aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
