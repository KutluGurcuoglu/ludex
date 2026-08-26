import { afterEach, describe, expect, it, vi } from "vitest";
import { getAIAnalysis, toAIAnalysisResult } from "./ai-analysis.service";
import type { AIEvaluationOutput } from "@/types";

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Şartname yokken AI'nın (ya da bu düzeltmeden önce üretilmiş, DB'de
 * donmuş eski bir cache satırının) uydurduğu "Şartname yüklenmelidir"
 * bulgusunu temsil eder — hem "fresh" hem "cached" senaryo aynı
 * AIEvaluationOutput şeklini paylaşır, aradaki fark yalnızca
 * toAIAnalysisResult'a geçilen hasSpecification bayrağıdır.
 */
function evaluationWithFakeSpecViolation(): AIEvaluationOutput {
  return {
    languageAnalysis: {
      detectedLanguage: "Türkçe",
      confidence: 0.95,
      summary: "Rapor Türkçe yazılmış.",
      issues: [],
    },
    specificationAnalysis: {
      compliant: false,
      findings: [
        {
          ruleText: "Şartname yüklenmelidir.",
          findingText: "Şartname henüz yüklenmemiştir.",
          severity: "high",
        },
      ],
      notes: "Şartname bulunamadı.",
    },
    templateAnalysis: { compliant: true, missingSections: [], notes: "Şablona uygun." },
    headingContentAnalysis: [
      { sectionId: "sec-1", headingPresent: true, contentMatchesExpectation: true, notes: "Uygun." },
    ],
    categoryFit: { fit: true, reason: "Kategoriyle uyumlu." },
    criteriaEvaluations: [
      { criterionId: "c1", score: 17, reason: "Problem net tanımlanmış.", criterionMaxScore: 20 },
    ],
    strengths: ["Güçlü yön."],
    areasForImprovement: ["Geliştirilebilir alan."],
    recommendations: ["Öneri."],
    similarReports: [],
    evidences: [],
  };
}

describe("toAIAnalysisResult — specification opsiyonelliği", () => {
  // A) specificationText yok (undefined) — AI'nın uydurduğu ihlal DB'ye/UI'ya sızmamalı.
  it("overrides a fabricated spec violation with a safe/neutral result when the category has no specification", () => {
    const result = toAIAnalysisResult("report-1", evaluationWithFakeSpecViolation(), false);

    expect(result.criticalFindings).toEqual([]);
    expect(result.specCompliance).toEqual([
      {
        id: "specification",
        label: "Şartname Uygunluğu",
        passed: true,
        detail: "Şartname yüklenmediği için şartname uygunluğu değerlendirilmedi.",
        evidenceIds: [],
      },
    ]);
  });

  // D) cached AIAnalysis içinde eski fake spec violation var, kategori hâlâ
  // şartnamesiz — aynı fonksiyon/aynı bayrak, "fresh" ile birebir aynı sonucu üretir.
  it("applies the exact same override to an old cached AIAnalysis row that predates this fix", () => {
    const cachedFromBeforeTheFix = evaluationWithFakeSpecViolation();

    const result = toAIAnalysisResult("report-1", cachedFromBeforeTheFix, false);

    expect(result.criticalFindings).toEqual([]);
    expect(result.specCompliance.every((c) => c.passed)).toBe(true);
  });

  // C) gerçek specificationText varsa AI'nın gerçek violation finding'i korunmalı.
  it("keeps a high spec finding but sets evidenceId to null when it has no verified evidence", () => {
    const output = evaluationWithFakeSpecViolation();
    output.specificationAnalysis = {
      compliant: false,
      findings: [
        {
          ruleText: "En az iki bağımsız sensör kullanılmalıdır.",
          findingText: "Rapor tek sensör kullanıyor.",
          severity: "high",
        },
      ],
      notes: "Şartnameye aykırı bir durum tespit edildi.",
    };

    const result = toAIAnalysisResult("report-1", output, true);

    expect(result.criticalFindings).toHaveLength(1);
    expect(result.criticalFindings[0].ruleText).toBe("En az iki bağımsız sensör kullanılmalıdır.");
    expect(result.criticalFindings[0].evidenceId).toBeNull();
    expect(result.specCompliance[0].passed).toBe(false);
  });

  it('keeps evidenceId as "spec-0" when a high spec finding has verified evidence', () => {
    const output = evaluationWithFakeSpecViolation();
    output.specificationAnalysis = {
      compliant: false,
      findings: [
        {
          ruleText: "En az iki bağımsız sensör kullanılmalıdır.",
          findingText: "Rapor tek sensör kullanıyor.",
          severity: "high",
          pageNumber: 2,
          exactExcerpt: "tek sensör",
        },
      ],
      notes: "Şartnameye aykırı bir durum tespit edildi.",
    };
    output.evidences = [{ id: "spec-0", page: 2, excerpt: "tek sensör" }];

    const result = toAIAnalysisResult("report-1", output, true);

    expect(result.criticalFindings).toHaveLength(1);
    expect(result.criticalFindings[0].evidenceId).toBe("spec-0");
  });

  // E) şartname yokken kalan AI analizi/kriter puanları kaybolmamalı.
  it("leaves every other part of the analysis (criteria scores, template, category fit, feedback) untouched when there is no specification", () => {
    const result = toAIAnalysisResult("report-1", evaluationWithFakeSpecViolation(), false);

    expect(result.criteriaEvaluations).toEqual([
      { id: "c1", label: "c1", score: 17, maxScore: 20, reason: "Problem net tanımlanmış.", evidenceIds: [] },
    ]);
    expect(result.categoryFitCheck.passed).toBe(true);
    expect(result.templateCompliance).toHaveLength(1);
    expect(result.contentAnalysis.strengths).toEqual(["Güçlü yön."]);
    expect(result.contentAnalysis.improvementSuggestions).toEqual(["Öneri."]);
    expect(result.languageCheck.detectedLanguage).toBe("Türkçe");
  });
});

/**
 * evaluation-workspace.tsx'teki handleStartAnalysis(), "checking" durumunda
 * takılı kalmamak için getAIAnalysis()'in reddettiği her durumda bir Error
 * (ve .message) almayı bekler. Bu testler, sunucu tarafı Cloudflare timeout
 * fix'inden SONRA /evaluate'in artık sonsuza kadar asılı kalmadan gerçek bir
 * hata yanıtı döndüğü senaryoda bu sözleşmenin hâlâ doğru çalıştığını doğrular.
 */
describe("getAIAnalysis", () => {
  it("rejects with the server's error message when /evaluate responds with a failure status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: "AI değerlendirmesi başarısız oldu." }),
      }))
    );

    await expect(getAIAnalysis("report-1", true)).rejects.toThrow(
      "AI değerlendirmesi başarısız oldu."
    );
  });

  it("propagates a network-level fetch rejection instead of hanging or swallowing it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network error");
      })
    );

    await expect(getAIAnalysis("report-1", true)).rejects.toThrow("network error");
  });
});
