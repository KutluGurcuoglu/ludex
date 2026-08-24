import type {
  AIAnalysisResult,
  ComplianceCheckItem,
  CriterionAiEvaluation,
  CriticalSpecFinding,
  Evidence,
} from "@/types";

/**
 * /api/reports/:id/evaluate gerçek AI pipeline'ının döndürdüğü şekil
 * (bkz. src/lib/ai-evaluation/schema.ts — buradan import etmek yerine
 * kopyalandı ki backend/frontend ayrımı net kalsın, bu yalnızca bir DTO).
 */
interface RealEvaluationOutput {
  languageAnalysis: {
    detectedLanguage: string;
    confidence: number; // 0-1
    summary: string;
    issues: string[];
  };
  specificationAnalysis: {
    compliant: boolean;
    findings: Array<{
      ruleText: string;
      findingText: string;
      severity: "low" | "medium" | "high";
      pageNumber?: number;
      exactExcerpt?: string;
    }>;
    notes: string;
  };
  templateAnalysis: {
    compliant: boolean;
    missingSections: string[];
    notes: string;
  };
  headingContentAnalysis: Array<{
    sectionId: string;
    headingPresent: boolean;
    contentMatchesExpectation: boolean;
    notes: string;
    pageNumber?: number;
    exactExcerpt?: string;
  }>;
  categoryFit: { fit: boolean; reason: string };
  criteriaEvaluations: Array<{
    criterionId: string;
    score: number | null;
    reason: string;
    evidence?: string;
    pageNumber?: number;
    exactExcerpt?: string;
    criterionLabel?: string;
    criterionMaxScore?: number;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  /**
   * Deterministik shingle/Jaccard benzerliğiyle hesaplanır (bkz.
   * src/lib/ai-evaluation/similarity.ts) — LLM çıktısı değildir, ama aynı
   * AI analiz kaydının parçası olarak API'den birlikte döner.
   */
  similarReports: Array<{
    id: string;
    reportLabel: string;
    matchPercentage: number;
    breakdown: Array<{
      targetPage: number;
      targetExcerpt: string;
      matchedPage: number;
      matchedExcerpt: string;
    }>;
  }>;
  similarityScore?: number;
  /** Sunucu tarafında doğrulanmış (gerçek sayfa metninde bulunan) kanıt alıntıları. */
  evidences: Evidence[];
  contextHash?: string;
}

/**
 * Gerçek AI çıktısını AIAnalysisResult şekline dönüştürür. Gerçek pipeline
 * kırmızı bayrak / AI yazım riski / genel puan ÜRETMEZ (bkz.
 * ai-evaluation/prompts.ts — bilerek böyle tasarlanmış, hakemin nihai
 * kararını AI'nın gölgelememesi için). Bu alanlar burada UYDURULMAZ; boş/
 * tanımsız bırakılır. Şartname uygunluğu, şablon uygunluğu, kriter
 * değerlendirmesi ve benzerlik ise artık gerçek pipeline'ın ürettiği somut
 * verilerle doldurulur; sunucu tarafında doğrulanmamış hiçbir
 * pageNumber/exactExcerpt buraya kadar gelmez (bkz. postprocess.ts).
 */
function toAIAnalysisResult(reportId: string, output: RealEvaluationOutput): AIAnalysisResult {
  const specCompliance: ComplianceCheckItem[] =
    output.specificationAnalysis.findings.length === 0
      ? [
          {
            id: "specification",
            label: "Şartname Uygunluğu",
            passed: output.specificationAnalysis.compliant,
            detail: output.specificationAnalysis.notes,
            evidenceIds: [],
          },
        ]
      : output.specificationAnalysis.findings.map((finding, index) => {
          const id = `spec-${index}`;
          const hasEvidence = Boolean(finding.pageNumber && finding.exactExcerpt);
          return {
            id,
            label: finding.ruleText,
            passed: false,
            detail: finding.findingText,
            evidenceIds: hasEvidence ? [id] : [],
            unverifiable: !hasEvidence,
            severity: finding.severity,
          };
        });

  const criticalFindings: CriticalSpecFinding[] = output.specificationAnalysis.findings
    .map((finding, index) => ({ finding, index }))
    .filter(({ finding }) => finding.severity === "high")
    .map(({ finding, index }) => ({
      id: `spec-${index}`,
      ruleText: finding.ruleText,
      findingText: finding.findingText,
      probability: finding.severity,
      evidenceId: `spec-${index}`,
    }));

  const templateCompliance: ComplianceCheckItem[] = output.headingContentAnalysis.map((h) => {
    const id = `heading-${h.sectionId}`;
    const hasEvidence = Boolean(h.pageNumber && h.exactExcerpt);
    const missing = output.templateAnalysis.missingSections.includes(h.sectionId);
    return {
      id,
      label: h.sectionId,
      passed: h.headingPresent && h.contentMatchesExpectation,
      detail: h.notes,
      evidenceIds: hasEvidence ? [id] : [],
      // Bölüm tamamen eksikse (missingSections) işaretlenecek bir konum
      // yoktur — sahte bir highlight üretmek yerine bunu açıkça belirtiriz.
      unverifiable: !hasEvidence && (missing || !h.headingPresent),
    };
  });

  const criteriaEvaluations: CriterionAiEvaluation[] = output.criteriaEvaluations.map((c) => {
    const id = `criterion-${c.criterionId}`;
    const hasEvidence = Boolean(c.pageNumber && c.exactExcerpt);
    return {
      id: c.criterionId,
      label: c.criterionLabel ?? c.criterionId,
      score: c.score,
      maxScore: c.criterionMaxScore,
      reason: c.reason,
      evidenceIds: hasEvidence ? [id] : [],
    };
  });

  return {
    reportId,
    generatedAt: new Date().toISOString(),

    languageCheck: {
      detectedLanguage: output.languageAnalysis.detectedLanguage,
      // Gerçek pipeline'a ayrı bir "beklenen dil" parametresi verilmiyor —
      // tespit edileni tekrar etmek, var olmayan bir beklentiyi uydurmaktan iyidir.
      expectedLanguage: output.languageAnalysis.detectedLanguage,
      passed: output.languageAnalysis.issues.length === 0,
      confidence: Math.round(output.languageAnalysis.confidence * 100),
    },

    categoryFitCheck: {
      matchedCategoryId: "",
      passed: output.categoryFit.fit,
      explanation: output.categoryFit.reason,
    },

    ruleProfile: { prohibitions: [], requirements: [], technicalRules: [] },
    criticalFindings,
    redFlags: [],
    specCompliance,
    templateCompliance,
    criteriaEvaluations,

    contentAnalysis: {
      summary: output.templateAnalysis.notes,
      strengths: output.strengths,
      weaknesses: output.areasForImprovement,
      improvementSuggestions: output.recommendations,
    },

    similarReports: output.similarReports,
    similarityScore: output.similarityScore,
    evidences: output.evidences,
  };
}

export async function getAIAnalysis(reportId: string): Promise<AIAnalysisResult> {
  const res = await fetch(`/api/reports/${reportId}/evaluate`, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? "AI analizi alınamadı.");
  }

  return toAIAnalysisResult(reportId, data.evaluation);
}
