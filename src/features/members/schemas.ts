import { z } from "zod";
import { APP_ROLES, type AppRole } from "@/lib/auth/roles";

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Enter their name.").max(120, "120 characters maximum."),
  email: z.string().trim().toLowerCase().min(1, "Enter their email address.").max(254, "This email address is too long.").pipe(z.email("Enter a valid email address.")),
  role: z.enum(APP_ROLES),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const emptyAccount: CreateAccountInput = { name: "", email: "", role: "developer" };

/** Roles an account manager may grant: owners grant any, administrators developer/viewer. */
export function grantableRoles(managerRole: AppRole): readonly AppRole[] {
  return managerRole === "owner" ? APP_ROLES : APP_ROLES.filter((r) => r === "developer" || r === "viewer");
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/**
 * Temporary password like "Kq7m-Xz3p-Rt8w-Hb2n" from a byte source (crypto in
 * production). Always holds an upper-case letter, a lower-case letter and a digit.
 */
export function makeTemporaryPassword(randomBytes: (size: number) => Uint8Array): string {
  for (;;) {
    const bytes = randomBytes(16);
    const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
    const password = chars.match(/.{4}/g)!.join("-");
    if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password)) return password;
  }
}
