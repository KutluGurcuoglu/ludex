import type {
  AIAnalysisResult,
  AIEvaluationOutput,
  ComplianceCheckItem,
  CriterionAiEvaluation,
  CriticalSpecFinding,
} from "@/types";

/**
 * Gerçek AI çıktısını AIAnalysisResult şekline dönüştürür. Gerçek pipeline
 * kırmızı bayrak / AI yazım riski / genel puan ÜRETMEZ (bkz.
 * ai-evaluation/prompts.ts — bilerek böyle tasarlanmış, hakemin nihai
 * kararını AI'nın gölgelememesi için). Bu alanlar burada UYDURULMAZ; boş/
 * tanımsız bırakılır. Şartname uygunluğu, şablon uygunluğu, kriter
 * değerlendirmesi ve benzerlik ise artık gerçek pipeline'ın ürettiği somut
 * verilerle doldurulur; sunucu tarafında doğrulanmamış hiçbir
 * pageNumber/exactExcerpt buraya kadar gelmez (bkz. postprocess.ts).
 *
 * Report.aiEvaluation üzerinden gelen, zaten sunucuda üretilmiş güncel bir
 * sonucu göstermek için de kullanılır (bkz. evaluation-workspace.tsx) —
 * böylece aynı dönüşüm mantığı iki yerde kopyalanmaz.
 */
export function toAIAnalysisResult(
  reportId: string,
  output: AIEvaluationOutput
): AIAnalysisResult {
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
