import { z } from "zod";
import {
  templateAnalysisInputSchema,
  templateSectionAnalysisOutputSchema,
  templateCriteriaAnalysisOutputSchema,
  type TemplateAnalysisOutput,
} from "./schema";
import {
  TEMPLATE_SECTION_ANALYSIS_SYSTEM_PROMPT,
  TEMPLATE_CRITERIA_ANALYSIS_SYSTEM_PROMPT,
  buildTemplateAnalysisPrompt,
} from "./prompts";
import { fetchCloudflareStructuredJson } from "@/lib/ai-shared/cloudflare-workers-ai";

const SECTION_ANALYSIS_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const CRITERIA_ANALYSIS_MODEL = "@cf/openai/gpt-oss-20b";

export async function analyzeTemplate(
  input: unknown
): Promise<TemplateAnalysisOutput> {
  const validatedInput = templateAnalysisInputSchema.parse(input);
  const userPrompt = buildTemplateAnalysisPrompt(validatedInput);

  const [sectionRawOutput, criteriaRawOutput] = await Promise.all([
    fetchCloudflareStructuredJson(
      TEMPLATE_SECTION_ANALYSIS_SYSTEM_PROMPT,
      userPrompt,
      z.toJSONSchema(templateSectionAnalysisOutputSchema),
      { model: SECTION_ANALYSIS_MODEL, maxTokens: 4096, temperature: 0 }
    ),
    fetchCloudflareStructuredJson(
      TEMPLATE_CRITERIA_ANALYSIS_SYSTEM_PROMPT,
      userPrompt,
      z.toJSONSchema(templateCriteriaAnalysisOutputSchema),
      { model: CRITERIA_ANALYSIS_MODEL, maxTokens: 4096, temperature: 0 }
    ),
  ]);

  const parsedSectionOutput =
    templateSectionAnalysisOutputSchema.safeParse(sectionRawOutput);
  if (!parsedSectionOutput.success) {
    throw new Error("Invalid AI template section analysis output", {
      cause: parsedSectionOutput.error,
    });
  }

  const parsedCriteriaOutput =
    templateCriteriaAnalysisOutputSchema.safeParse(criteriaRawOutput);
  if (!parsedCriteriaOutput.success) {
    throw new Error("Invalid AI template criteria analysis output", {
      cause: parsedCriteriaOutput.error,
    });
  }

  const warnings = Array.from(
    new Set([
      ...parsedSectionOutput.data.warnings,
      ...parsedCriteriaOutput.data.warnings,
    ])
  );

  return {
    sections: parsedSectionOutput.data.sections,
    evaluationCriteria: parsedCriteriaOutput.data.evaluationCriteria,
    warnings,
  };
}
