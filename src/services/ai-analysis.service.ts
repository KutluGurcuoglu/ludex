import type { AIAnalysisResult, ComplianceCheckItem } from "@/types";

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
  }>;
  categoryFit: { fit: boolean; reason: string };
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
    breakdown: Array<{ sectionLabel: string; matchPercentage: number }>;
  }>;
  similarityScore?: number;
}

/**
 * Gerçek AI çıktısını AIAnalysisResult şekline dönüştürür. Gerçek pipeline
 * kırmızı bayrak / kritik şartname bulgusu / AI yazım riski / genel puan
 * ÜRETMEZ (bkz. ai-evaluation/prompts.ts — bilerek böyle tasarlanmış, hakemin
 * nihai kararını AI'nın gölgelememesi için). Bu alanlar burada UYDURULMAZ;
 * boş/tanımsız bırakılır — ilgili UI bölümleri zaten bunlar boşken kendini
 * gizliyor. Benzerlik (similarReports/similarityScore) istisnadır: LLM'den
 * gelmez ama route tarafından deterministik olarak hesaplanıp gerçek AI analiz
 * kaydına eklenir (bkz. src/lib/ai-evaluation/similarity.ts) — o yüzden burada
 * uydurulmadan doğrudan aktarılır.
 */
function toAIAnalysisResult(reportId: string, output: RealEvaluationOutput): AIAnalysisResult {
  const templateCompliance: ComplianceCheckItem[] = output.headingContentAnalysis.map((h) => ({
    id: h.sectionId,
    label: h.sectionId,
    passed: h.headingPresent && h.contentMatchesExpectation,
    detail: h.notes,
    evidenceIds: [],
  }));

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
    criticalFindings: [],
    redFlags: [],
    specCompliance: [],
    templateCompliance,

    contentAnalysis: {
      summary: output.templateAnalysis.notes,
      strengths: output.strengths,
      weaknesses: output.areasForImprovement,
      improvementSuggestions: output.recommendations,
    },

    similarReports: output.similarReports,
    similarityScore: output.similarityScore,
    evidences: [],
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
