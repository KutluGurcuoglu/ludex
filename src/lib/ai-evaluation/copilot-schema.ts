import { z } from "zod";

export const copilotOutputSchema = z.object({
  answer: z.string().min(1),
});

export type CopilotOutput = z.infer<typeof copilotOutputSchema>;
