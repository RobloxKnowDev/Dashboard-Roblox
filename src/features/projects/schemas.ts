import { z } from "zod";
import { Constants } from "@/types/database";

/**
 * Shared by the form (client validation) and the Server Action (authoritative).
 * Error messages are dictionary keys, translated on screen with useMessage().
 */
export const projectSchema = z.object({
  name: z.string().trim().min(2, "projects.validation.nameRequired").max(120, "projects.validation.nameMax"),
  description: z.string().trim().max(2000, "projects.validation.descriptionMax"),
  coverImageUrl: z.union([z.literal(""), z.url({ protocol: /^https$/, message: "projects.validation.imageHttps" })]),
  status: z.enum(Constants.public.Enums.project_status),
  progress: z.number().int().min(0, "projects.validation.progressRange").max(100, "projects.validation.progressRange"),
  targetReleaseDate: z.union([z.literal(""), z.iso.date("projects.validation.dateInvalid")]),
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
