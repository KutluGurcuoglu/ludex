import { z } from "zod";
import {
  templateAnalysisInputSchema,
  templateSectionAnalysisOutputSchema,
  templateCriteriaAnalysisOutputSchema,
  type TemplateAnalysisOutput,
  type TemplateSectionAnalysisOutput,
} from "./schema";
import {
  TEMPLATE_SECTION_ANALYSIS_SYSTEM_PROMPT,
  TEMPLATE_CRITERIA_ANALYSIS_SYSTEM_PROMPT,
  buildTemplateAnalysisPrompt,
} from "./prompts";
import { fetchCloudflareStructuredJson } from "@/lib/ai-shared/cloudflare-workers-ai";

const SECTION_ANALYSIS_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const CRITERIA_ANALYSIS_MODEL = "@cf/openai/gpt-oss-20b";

/**
 * Şablondaki rapor bölümlerini TEK BAŞINA çıkarır — kriter analiz çağrısını
 * tetiklemez. Yalnızca sections'a ihtiyaç duyan çağıranlar (ör. rapor
 * şablonu upload pipeline'ı) için; analyzeTemplate()'in yaptığı ikinci,
 * gereksiz AI çağrısından (kriter analizi) kaçınır.
 */
export async function analyzeTemplateSections(
  input: unknown
): Promise<TemplateSectionAnalysisOutput> {
  const validatedInput = templateAnalysisInputSchema.parse(input);
  const userPrompt = buildTemplateAnalysisPrompt(validatedInput);

  const rawOutput = await fetchCloudflareStructuredJson(
    TEMPLATE_SECTION_ANALYSIS_SYSTEM_PROMPT,
    userPrompt,
    z.toJSONSchema(templateSectionAnalysisOutputSchema),
    { model: SECTION_ANALYSIS_MODEL, maxTokens: 4096, temperature: 0 }
  );

  const parsedSectionOutput =
    templateSectionAnalysisOutputSchema.safeParse(rawOutput);
  if (!parsedSectionOutput.success) {
    throw new Error("Invalid AI template section analysis output", {
      cause: parsedSectionOutput.error,
    });
  }

  return parsedSectionOutput.data;
}

export async function analyzeTemplate(
  input: unknown
): Promise<TemplateAnalysisOutput> {
  const validatedInput = templateAnalysisInputSchema.parse(input);
  const userPrompt = buildTemplateAnalysisPrompt(validatedInput);

  const [sectionOutput, criteriaRawOutput] = await Promise.all([
    analyzeTemplateSections(validatedInput),
    fetchCloudflareStructuredJson(
      TEMPLATE_CRITERIA_ANALYSIS_SYSTEM_PROMPT,
      userPrompt,
      z.toJSONSchema(templateCriteriaAnalysisOutputSchema),
      { model: CRITERIA_ANALYSIS_MODEL, maxTokens: 4096, temperature: 0 }
    ),
  ]);

  const parsedCriteriaOutput =
    templateCriteriaAnalysisOutputSchema.safeParse(criteriaRawOutput);
  if (!parsedCriteriaOutput.success) {
    throw new Error("Invalid AI template criteria analysis output", {
      cause: parsedCriteriaOutput.error,
    });
  }

  const warnings = Array.from(
    new Set([...sectionOutput.warnings, ...parsedCriteriaOutput.data.warnings])
  );

  return {
    sections: sectionOutput.sections,
    evaluationCriteria: parsedCriteriaOutput.data.evaluationCriteria,
    warnings,
  };
}
