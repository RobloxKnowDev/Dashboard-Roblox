import { z } from "zod";
import { Constants } from "@/types/database";

/** Shared by the form (client validation) and the Server Action (authoritative). */
export const projectSchema = z.object({
  name: z.string().trim().min(2, "Give the project a name (2 characters minimum).").max(120, "120 characters maximum."),
  description: z.string().trim().max(2000, "2,000 characters maximum."),
  coverImageUrl: z.union([z.literal(""), z.url({ protocol: /^https$/, message: "Use an https:// image link." })]),
  status: z.enum(Constants.public.Enums.project_status),
  progress: z.number().int().min(0, "Between 0 and 100.").max(100, "Between 0 and 100."),
  targetReleaseDate: z.union([z.literal(""), z.iso.date("Pick a valid date.")]),
  gameId: z.union([z.literal(""), z.uuid()]),
  memberIds: z.array(z.uuid()).max(50),
});

export type ProjectInput = z.infer<typeof projectSchema>;

export const emptyProject: ProjectInput = {
  name: "",
  description: "",
  coverImageUrl: "",
  status: "planning",
  progress: 0,
  targetReleaseDate: "",
  gameId: "",
  memberIds: [],
};
