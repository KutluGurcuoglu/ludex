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
  /**
   * Category.description — kategori uygunluğu değerlendirmesinin (categoryFit)
   * yalnızca kategori adı tahminine değil, adminin girdiği gerçek kategori
   * bağlamına dayanabilmesi için. Admin bir açıklama girmemişse boş bırakılır;
   * bu durumda değerlendirme öncekiyle aynı şekilde yalnızca kategori adına
   * göre yapılır.
   */
  categoryDescription: z.string().optional(),
  reportTitle: z.string().optional(),
  /** Yarışmanın güncel şartname PDF'inden çıkarılmış gerçek metni. Yüklenmemişse boş bırakılır. */
  specificationContent: z.string().optional(),
  specificationRules: z
    .array(
      z.object({ id: z.string().min(1), text: z.string().min(1), sourceLabel: z.string().min(1) })
    )
    .default([]),
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
  /** Yalnızca raporda gerçekten var olan bir alıntı için doldurulur — kanıt yoksa boş bırakılır. */
  pageNumber: z.number().int().positive().optional(),
  exactExcerpt: z.string().optional(),
});

export const categoryFitSchema = z.object({
  fit: z.boolean(),
  reason: z.string().min(1),
});

export const relevanceAnalysisSchema = z.object({
  status: z.enum(["relevant", "uncertain", "unrelated"]).default("uncertain"),
  specificationRuleIds: z.array(z.string().min(1)).default([]),
  reportPageNumber: z.number().int().positive().optional(),
  reportExcerpt: z.string().optional(),
  explanation: z.string().min(1).default("Kategori/problem eşleşmesi doğrulanamadı."),
  confidence: z.number().min(0).max(1).default(0),
  mappedConcepts: z.array(z.string().min(1)).default([]),
});

/** The small, authoritative gate run before the much larger criterion evaluation. */
export const relevancePreflightInputSchema = evaluationInputSchema.pick({
  reportContent: true,
  category: true,
  categoryDescription: true,
  reportTitle: true,
  specificationRules: true,
});

export const criterionEvaluationSchema = z.object({
  criterionId: z.string().min(1),
  score: z.number().min(0).nullable(),
  scoreUnavailableReason: z
    .enum(["relevance_blocked", "evidence_unverified", "scale_missing"])
    .optional(),
  reason: z.string().min(1),
  evidence: z.string().min(1).optional(),
  pageNumber: z.number().int().positive().optional(),
  exactExcerpt: z.string().optional(),
  /** LLM tarafından üretilmez; route, ilgili kriterin (getEffectiveCriteria) label'ını burada damgalar. */
  criterionLabel: z.string().optional(),
  criterionMaxScore: z.number().positive().optional(),
});

/** Şartnamedeki bir kurala karşı raporda tespit edilen somut bir bulgu. */
export const specificationFindingSchema = z.object({
  /** Server-issued ID from evaluationInput.specificationRules; free-form rules are never authoritative. */
  ruleId: z.string().min(1).optional(),
  /** Stamped by the server from the authoritative specification. */
  ruleSourceLabel: z.string().min(1).optional(),
  ruleText: z.string().min(1),
  findingText: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]),
  classification: z.enum(["disqualification", "requirement"]).optional(),
  /** Yalnızca raporda gerçekten var olan bir alıntı için doldurulur. */
  pageNumber: z.number().int().positive().optional(),
  exactExcerpt: z.string().optional(),
});

export const specificationAnalysisSchema = z.object({
  compliant: z.boolean(),
  findings: z.array(specificationFindingSchema),
  notes: z.string().min(1),
});

/**
 * Bir başka raporla paylaşılan somut bir pasaj eşleşmesi — deterministik
 * shingle karşılaştırmasından gelir (bkz. similarity.ts), sayfa+alıntı
 * gerçek extractedPages içeriğinden dilimlenir, asla LLM tarafından üretilmez.
 */
export const similarityBreakdownItemSchema = z.object({
  targetPage: z.number().int().positive(),
  targetExcerpt: z.string().min(1),
  matchedPage: z.number().int().positive(),
  matchedExcerpt: z.string().min(1),
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
  specificationAnalysis: specificationAnalysisSchema,
  templateAnalysis: templateAnalysisSchema,
  headingContentAnalysis: z.array(headingContentAnalysisItemSchema).min(1),
  categoryFit: categoryFitSchema,
  relevanceAnalysis: relevanceAnalysisSchema.default({
    status: "uncertain",
    specificationRuleIds: [],
    explanation: "Kategori/problem eşleşmesi doğrulanamadı.",
    confidence: 0,
    mappedConcepts: [],
  }),
  overallComplianceStatus: z.enum(["compliant", "non_compliant", "needs_review", "not_evaluated"]).default("needs_review"),
  criteriaEvaluations: z.array(criterionEvaluationSchema).min(1),
  strengths: z.array(z.string().min(1)),
  areasForImprovement: z.array(z.string().min(1)),
  recommendations: z.array(z.string().min(1)),
  /** LLM bu alanı hiç üretmez; varsayılan boş dizi, route tarafından doldurulur. */
  similarReports: z.array(similarReportMatchSchema).default([]),
  /** En yüksek similarReports eşleşmesinin yüzdesi (varsa) — route tarafından set edilir. */
  similarityScore: z.number().min(0).max(100).optional(),
  /**
   * O anki şartname metni + şablon bölümleri + efektif kriterlerin hash'i
   * (bkz. context-hash.ts). LLM bu alanı hiç üretmez; her zaman route
   * tarafından set edilir — hangi konfigürasyonla üretildiğini kalıcı olarak
   * işaretler (bkz. GET /api/reports'taki aiAnalysisStale hesaplaması).
   */
  contextHash: z.string().optional(),
  /** Doğrulanmış (gerçek sayfa metninde bulunan) kanıt alıntıları — route tarafından hesaplanır. */
  evidences: z
    .array(
      z.object({
        id: z.string().min(1),
        page: z.number().int().positive(),
        excerpt: z.string().min(1),
        note: z.string().optional(),
      })
    )
    .default([]),
});

export type LanguageAnalysis = z.infer<typeof languageAnalysisSchema>;
export type SpecificationFinding = z.infer<typeof specificationFindingSchema>;
export type SpecificationAnalysis = z.infer<typeof specificationAnalysisSchema>;
export type TemplateAnalysis = z.infer<typeof templateAnalysisSchema>;
export type HeadingContentAnalysisItem = z.infer<
  typeof headingContentAnalysisItemSchema
>;
export type CategoryFit = z.infer<typeof categoryFitSchema>;
export type RelevanceAnalysis = z.infer<typeof relevanceAnalysisSchema>;
export type RelevancePreflightInput = z.infer<typeof relevancePreflightInputSchema>;
export type CriterionEvaluation = z.infer<typeof criterionEvaluationSchema>;
export type SimilarityBreakdownItem = z.infer<typeof similarityBreakdownItemSchema>;
export type SimilarReportMatch = z.infer<typeof similarReportMatchSchema>;
export type EvaluationOutput = z.infer<typeof evaluationOutputSchema>;
