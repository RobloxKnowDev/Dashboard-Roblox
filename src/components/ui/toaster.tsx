"use client";

import { Toaster as Sonner } from "sonner";

/** Global toast host — call `toast.success(...)` / `toast.error(...)` from "sonner" anywhere. */
export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "rounded-lg! border! border-line-strong! bg-surface-3! text-fg! shadow-xl! shadow-black/40! font-sans! text-[13px]!",
          description: "text-fg-3!",
          closeButton: "border-line-strong! bg-surface-2! text-fg-3!",
          success: "[&_[data-icon]]:text-good!",
          error: "[&_[data-icon]]:text-critical!",
          warning: "[&_[data-icon]]:text-warning!",
          info: "[&_[data-icon]]:text-info!",
        },
      }}
    />
  );
}
