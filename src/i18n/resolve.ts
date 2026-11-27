import type { Messages } from "./messages";

/**
 * Looks up a dotted key ("auth.validation.emailRequired") in a dictionary.
 * Used for texts that travel as data — Zod error messages and Server Action
 * results carry keys, and the screen translates them. Returns the key itself
 * when it isn't a string entry (so plain texts pass through untouched).
 */
export function resolveMessage(t: Messages, key: string): string {
  let node: unknown = t;
  for (const part of key.split(".")) {
    if (node === null || typeof node !== "object") return key;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : key;
}
