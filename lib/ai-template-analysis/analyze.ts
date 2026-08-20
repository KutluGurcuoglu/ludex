import { z } from "zod";
import {
  templateAnalysisInputSchema,
  templateAnalysisOutputSchema,
  type TemplateAnalysisOutput,
} from "./schema";
import {
  TEMPLATE_ANALYSIS_SYSTEM_PROMPT,
  buildTemplateAnalysisPrompt,
} from "./prompts";
import { fetchCloudflareStructuredJson } from "@/lib/ai-shared/cloudflare-workers-ai";

export async function analyzeTemplate(
  input: unknown
): Promise<TemplateAnalysisOutput> {
  const validatedInput = templateAnalysisInputSchema.parse(input);
  const userPrompt = buildTemplateAnalysisPrompt(validatedInput);

  const rawOutput = await fetchCloudflareStructuredJson(
    TEMPLATE_ANALYSIS_SYSTEM_PROMPT,
    userPrompt,
    z.toJSONSchema(templateAnalysisOutputSchema)
  );

  const parsedOutput = templateAnalysisOutputSchema.safeParse(rawOutput);
  if (!parsedOutput.success) {
    throw new Error("Invalid AI template analysis output", {
      cause: parsedOutput.error,
    });
  }

  return parsedOutput.data;
}
