"use client";

import { Bell, BellOff, CheckCheck } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/feedback/states";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils/cn";

export type NotificationItem = {
  id: string;
  title: string;
  body?: string;
  href?: string;
  /** Pre-formatted relative time, computed where "now" is known. */
  time: string;
  read: boolean;
};

type NotificationCenterProps = {
  notifications?: NotificationItem[];
};

/**
 * Bell + popover listing the user's notifications (Supabase `notifications`
 * table, live). Until the database is connected the list is empty.
 */
export function NotificationCenter({ notifications = [] }: NotificationCenterProps) {
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <Popover>
      <PopoverTrigger
        className="relative rounded-md p-2 text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg data-[state=open]:bg-surface-2 data-[state=open]:text-fg"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent ring-2 ring-canvas" aria-hidden />
        ) : null}
      </PopoverTrigger>
      <PopoverContent className="w-[22rem] p-0">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-[13px] font-semibold text-fg">Notifications</h2>
          <button
            type="button"
            disabled={unread === 0}
            className="inline-flex items-center gap-1 text-xs text-fg-3 transition-colors hover:text-fg disabled:pointer-events-none disabled:opacity-40"
          >
            <CheckCheck className="size-3.5" aria-hidden />
            Mark all read
          </button>
        </header>
        {notifications.length === 0 ? (
          <EmptyState
            compact
            icon={BellOff}
            title="You're all caught up"
            description="Task assignments, agent errors and game alerts will appear here."
          />
        ) : (
          <ul className="max-h-96 overflow-y-auto py-1">
            {notifications.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.href ?? "#"}
                  className={cn("flex gap-3 px-4 py-2.5 transition-colors hover:bg-surface-3", !n.read && "bg-accent/[0.03]")}
                >
                  <span
                    className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-accent")}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-fg">{n.title}</span>
                    {n.body ? <span className="block truncate text-xs text-fg-3">{n.body}</span> : null}
                  </span>
                  <span className="shrink-0 text-[11px] text-fg-4">{n.time}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
