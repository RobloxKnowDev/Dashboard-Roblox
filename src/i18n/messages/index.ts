import type { Locale } from "../config";
import { en } from "./en";
import { fr } from "./fr";

/**
 * Interface texts, one dictionary per language, split by domain
 * (messages/<lang>/<domain>.ts). English is the reference type: a missing or
 * extra key in French fails the type check. Values are strings, or functions
 * for texts with variables (dictionaries are imported directly on both the
 * server and the client — they never cross the network).
 */
export type Messages = typeof en;

export const messages: Record<Locale, Messages> = { en, fr };
