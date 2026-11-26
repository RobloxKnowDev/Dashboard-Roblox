import { z } from "zod";
import { Constants } from "@/types/database";

/** Team member card (with or without an account). Shared by form and Server Action. */
export const memberSchema = z.object({
  displayName: z.string().trim().min(1, "Enter a name.").max(80, "80 characters maximum."),
  studioRole: z.string().trim().max(80, "80 characters maximum."),
  status: z.enum(Constants.public.Enums.member_status),
  avatarUrl: z.union([z.literal(""), z.url({ protocol: /^https$/, message: "Use an https:// image link." })]),
  joinedAt: z.iso.date("Pick a valid date."),
});

export type MemberInput = z.infer<typeof memberSchema>;

export const emptyMember: MemberInput = { displayName: "", studioRole: "", status: "active", avatarUrl: "", joinedAt: "" };
