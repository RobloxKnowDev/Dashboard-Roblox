import { z } from "zod";
import { Constants } from "@/types/database";

/**
 * Team member card (with or without an account). Shared by form and Server Action.
 * Error messages are dictionary keys, translated on screen with useMessage().
 */
export const memberSchema = z.object({
  displayName: z.string().trim().min(1, "team.validation.nameRequired").max(80, "team.validation.max80"),
  studioRole: z.string().trim().max(80, "team.validation.max80"),
  status: z.enum(Constants.public.Enums.member_status),
  avatarUrl: z.union([z.literal(""), z.url({ protocol: /^https$/, message: "team.validation.imageHttps" })]),
  joinedAt: z.iso.date("team.validation.dateInvalid"),
});

export type MemberInput = z.infer<typeof memberSchema>;

export const emptyMember: MemberInput = { displayName: "", studioRole: "", status: "active", avatarUrl: "", joinedAt: "" };
