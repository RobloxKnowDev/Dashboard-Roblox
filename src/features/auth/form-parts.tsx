"use client";

import { CircleCheck, CircleExclamationPoint, Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export function AuthHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-xl font-semibold tracking-tight text-fg">{title}</h1>
      {description ? <p className="mt-1.5 text-[13px] leading-relaxed text-fg-3">{description}</p> : null}
    </div>
  );
}

/** Form-level message (error or success), announced to screen readers. */
export function FormMessage({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const Icon = tone === "error" ? CircleExclamationPoint : CircleCheck;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-[13px] leading-relaxed",
        tone === "error" ? "border-critical/25 bg-critical/10 text-critical" : "border-good/25 bg-good/10 text-good",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

/** Password input with a show/hide toggle. */
export function PasswordInput({ id, invalid, className, ...props }: ComponentProps<"input"> & { id: string; invalid?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        aria-invalid={invalid}
        aria-describedby={describedBy(id)}
        className={cn("pr-9", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-fg-3 transition-colors hover:text-fg"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </div>
  );
}
