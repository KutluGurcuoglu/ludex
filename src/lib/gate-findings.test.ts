import { describe, expect, it } from "vitest";
import { buildGateFindings } from "./gate-findings";
import type { AIAnalysisResult } from "@/types";

function baseAnalysis(overrides: Partial<AIAnalysisResult> = {}): AIAnalysisResult {
  return {
    reportId: "report-1",
    generatedAt: "2026-08-26T00:00:00.000Z",
    languageCheck: {
      detectedLanguage: "Türkçe",
      expectedLanguage: "Türkçe",
      passed: true,
      confidence: 95,
    },
    categoryFitCheck: { matchedCategoryId: "cat-1", passed: true, explanation: "Uygun." },
    ruleProfile: { prohibitions: [], requirements: [], technicalRules: [] },
    criticalFindings: [],
    redFlags: [],
    specCompliance: [],
    templateCompliance: [],
    criteriaEvaluations: [],
    contentAnalysis: {
      summary: "",
      strengths: [],
      weaknesses: [],
      improvementSuggestions: [],
    },
    similarReports: [],
    evidences: [],
    ...overrides,
  };
}

describe("buildGateFindings", () => {
  it("keeps a duplicated high spec finding only once when criticalFindings already contains the same id", () => {
    const result = buildGateFindings(
      baseAnalysis({
        criticalFindings: [
          {
            id: "spec-0",
            ruleText: "Yasak malzeme kullanılmamalıdır.",
            findingText: "Rapor yasak malzeme içeriyor.",
            probability: "high",
            evidenceId: "spec-0",
          },
        ],
        specCompliance: [
          {
            id: "spec-0",
            label: "Yasak malzeme kullanılmamalıdır.",
            passed: false,
            detail: "Rapor yasak malzeme içeriyor.",
            evidenceIds: ["spec-0"],
            severity: "high",
          },
        ],
      })
    );

    expect(result.filter((finding) => finding.id === "spec-0")).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({ id: "spec-0", kind: "critical", allowsElimination: false })
    );
  });

  it("keeps failed non-critical specCompliance items in the gate list", () => {
    const result = buildGateFindings(
      baseAnalysis({
        specCompliance: [
          {
            id: "spec-1",
            label: "Özet bölümü şartnameye uymalıdır.",
            passed: false,
            detail: "Özet eksik.",
            evidenceIds: [],
            severity: "medium",
          },
        ],
      })
    );

    expect(result).toEqual([
      expect.objectContaining({
        id: "spec-1",
        kind: "spec",
        title: "ŞARTNAMEYE AYKIRI DURUM",
        allowsElimination: false,
      }),
    ]);
  });

  it("keeps other critical findings unchanged", () => {
    const result = buildGateFindings(
      baseAnalysis({
        criticalFindings: [
          {
            id: "critical-custom",
            ruleText: "Kritik kural.",
            findingText: "Kritik bulgu.",
            probability: "high",
            evidenceId: null,
          },
        ],
      })
    );

    expect(result).toEqual([
      {
        id: "critical-custom",
        kind: "critical",
        title: "KRİTİK ŞARTNAME BULGUSU",
        ruleText: "Kritik kural.",
        findingText: "Kritik bulgu.",
        probability: "high",
        evidenceId: null,
        allowsElimination: false,
      },
    ]);
  });

  it("allows elimination only for a validated explicit disqualification finding", () => {
    const result = buildGateFindings(
      baseAnalysis({
        criticalFindings: [
          {
            id: "spec-1",
            ruleText: "Bu koşulu sağlamayan başvurular diskalifiye edilir.",
            findingText: "Rapor koşulu sağlamıyor.",
            probability: "high",
            evidenceId: "spec-1",
            classification: "disqualification",
            sourceLabel: "Şartname bölüm 2",
          },
        ],
      })
    );

    expect(result[0]).toEqual(
      expect.objectContaining({ allowsElimination: true, sourceLabel: "Şartname bölüm 2" })
    );
  });
});
