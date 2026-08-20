import { z } from "zod";

export const templateAnalysisInputSchema = z.object({
  templateContent: z.string().min(1),
});

export type TemplateAnalysisInput = z.infer<typeof templateAnalysisInputSchema>;

export const templateAnalysisSectionSchema = z.object({
  title: z.string().min(1),
  expectedContent: z.string().min(1),
  order: z.number().int().positive(),
});

export const templateAnalysisCriterionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  maxScore: z.number().positive().nullable(),
});

export const templateAnalysisOutputSchema = z.object({
  sections: z.array(templateAnalysisSectionSchema),
  evaluationCriteria: z.array(templateAnalysisCriterionSchema),
  warnings: z.array(z.string().min(1)),
});

export type TemplateAnalysisSection = z.infer<typeof templateAnalysisSectionSchema>;
export type TemplateAnalysisCriterion = z.infer<
  typeof templateAnalysisCriterionSchema
>;
export type TemplateAnalysisOutput = z.infer<typeof templateAnalysisOutputSchema>;

// Internal structured-output schemas for the two independent AI calls that
// analyzeTemplate() merges into templateAnalysisOutputSchema above.

export const templateSectionAnalysisOutputSchema = z.object({
  sections: z.array(templateAnalysisSectionSchema),
  warnings: z.array(z.string().min(1)),
});

export const templateCriteriaAnalysisOutputSchema = z.object({
  evaluationCriteria: z.array(templateAnalysisCriterionSchema),
  warnings: z.array(z.string().min(1)),
});

export type TemplateSectionAnalysisOutput = z.infer<
  typeof templateSectionAnalysisOutputSchema
>;
export type TemplateCriteriaAnalysisOutput = z.infer<
  typeof templateCriteriaAnalysisOutputSchema
>;
