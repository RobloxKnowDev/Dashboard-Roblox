"use client";

import { useT } from "./client";
import { resolveMessage } from "./resolve";

/**
 * Translated text by key, for components shared between server and client
 * trees (they can neither await getT() nor call useT()): <Msg k="common.states.loading" />.
 * Text nodes only — attributes need a string from getT()/useT().
 */
export function Msg({ k }: { k: string }) {
  return resolveMessage(useT(), k);
}
