import { z } from "zod";

// --- Input ---

export const evaluationCriterionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  maxScore: z.number().positive().optional(),
});

export const templateSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  expectedContent: z.string().min(1),
});

export const reportTemplateSchema = z.object({
  sections: z.array(templateSectionSchema).min(1),
});

export const evaluationInputSchema = z.object({
  reportContent: z.string().min(1),
  category: z.string().min(1),
  template: reportTemplateSchema,
  evaluationCriteria: z.array(evaluationCriterionSchema).min(1),
});

export type EvaluationCriterion = z.infer<typeof evaluationCriterionSchema>;
export type TemplateSection = z.infer<typeof templateSectionSchema>;
export type ReportTemplate = z.infer<typeof reportTemplateSchema>;
export type EvaluationInput = z.infer<typeof evaluationInputSchema>;

// --- Output ---

export const languageAnalysisSchema = z.object({
  detectedLanguage: z.string().min(1),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1),
  issues: z.array(z.string().min(1)),
});

export const templateAnalysisSchema = z.object({
  compliant: z.boolean(),
  missingSections: z.array(z.string().min(1)),
  notes: z.string().min(1),
});

export const headingContentAnalysisItemSchema = z.object({
  sectionId: z.string().min(1),
  headingPresent: z.boolean(),
  contentMatchesExpectation: z.boolean(),
  notes: z.string().min(1),
});

export const categoryFitSchema = z.object({
  fit: z.boolean(),
  reason: z.string().min(1),
});

export const criterionEvaluationSchema = z.object({
  criterionId: z.string().min(1),
  score: z.number().min(0).nullable(),
  reason: z.string().min(1),
  evidence: z.string().min(1).optional(),
});

/** Bir başka raporla tespit edilen benzerliğin bölüm bazlı kırılımı (varsa). */
export const similarityBreakdownItemSchema = z.object({
  sectionLabel: z.string().min(1),
  matchPercentage: z.number().min(0).max(100),
});

/**
 * Raporlar arası benzerlik eşleşmesi. LLM tarafından ÜRETİLMEZ — deterministik
 * shingle/Jaccard algoritmasıyla (bkz. src/lib/ai-evaluation/similarity.ts)
 * `/api/reports/:id/evaluate` route'unda hesaplanıp evaluateReport()'un ham
 * çıktısına eklenir. Şemada yer alması, tek bir AIAnalysis kaydında (aynı JSON)
 * kalıcı saklanmasını sağlar.
 */
export const similarReportMatchSchema = z.object({
  id: z.string().min(1),
  reportLabel: z.string().min(1),
  matchPercentage: z.number().min(0).max(100),
  breakdown: z.array(similarityBreakdownItemSchema),
});

export const evaluationOutputSchema = z.object({
  languageAnalysis: languageAnalysisSchema,
  templateAnalysis: templateAnalysisSchema,
  headingContentAnalysis: z.array(headingContentAnalysisItemSchema).min(1),
  categoryFit: categoryFitSchema,
  criteriaEvaluations: z.array(criterionEvaluationSchema).min(1),
  strengths: z.array(z.string().min(1)),
  areasForImprovement: z.array(z.string().min(1)),
  recommendations: z.array(z.string().min(1)),
  /** LLM bu alanı hiç üretmez; varsayılan boş dizi, route tarafından doldurulur. */
  similarReports: z.array(similarReportMatchSchema).default([]),
  /** En yüksek similarReports eşleşmesinin yüzdesi (varsa) — route tarafından set edilir. */
  similarityScore: z.number().min(0).max(100).optional(),
});

export type LanguageAnalysis = z.infer<typeof languageAnalysisSchema>;
export type TemplateAnalysis = z.infer<typeof templateAnalysisSchema>;
export type HeadingContentAnalysisItem = z.infer<
  typeof headingContentAnalysisItemSchema
>;
export type CategoryFit = z.infer<typeof categoryFitSchema>;
export type CriterionEvaluation = z.infer<typeof criterionEvaluationSchema>;
export type SimilarityBreakdownItem = z.infer<typeof similarityBreakdownItemSchema>;
export type SimilarReportMatch = z.infer<typeof similarReportMatchSchema>;
export type EvaluationOutput = z.infer<typeof evaluationOutputSchema>;
