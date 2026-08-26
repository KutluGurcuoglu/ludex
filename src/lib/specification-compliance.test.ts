import { describe, expect, it } from "vitest";
import { normalizeSpecificationAnalysis, NO_SPECIFICATION_NOTES } from "./specification-compliance";

const FAKE_SPEC_VIOLATION = {
  compliant: false,
  findings: [
    {
      ruleText: "Şartname yüklenmelidir.",
      findingText: "Şartname henüz yüklenmemiştir.",
      severity: "high" as const,
    },
  ],
  notes: "Şartname bulunamadı.",
};

const REAL_SPEC_VIOLATION = {
  compliant: false,
  findings: [
    {
      ruleText: "En az iki bağımsız sensör kullanılmalıdır.",
      findingText: "Rapor tek sensör kullanıyor.",
      severity: "high" as const,
    },
  ],
  notes: "Şartnameye aykırı bir durum tespit edildi.",
};

describe("normalizeSpecificationAnalysis", () => {
  const TURKISH_LANGUAGE_ANALYSIS = {
    detectedLanguage: "Türkçe",
    confidence: 0.95,
    summary: "Rapor Türkçe yazılmış.",
    issues: [],
  };

  it("removes a high-severity language contradiction when the detected language matches the rule", () => {
    const result = normalizeSpecificationAnalysis(
      {
        compliant: false,
        findings: [
          {
            ruleText: "Rapor, şartnamede belirtilen Türkçe dilinde yazılmalıdır.",
            findingText: "Raporun dili şartnameye uygun değildir.",
            severity: "high" as const,
          },
        ],
        notes: "Dil kuralı ihlal edildi.",
      },
      true,
      TURKISH_LANGUAGE_ANALYSIS
    );

    expect(result).toEqual({
      compliant: true,
      findings: [],
      notes: "Dil kuralı ihlal edildi.",
    });
  });

  it("keeps a language finding when detection contradicts the rule", () => {
    const result = normalizeSpecificationAnalysis(
      {
        compliant: false,
        findings: [
          {
            ruleText: "Rapor, şartnamede belirtilen Türkçe dilinde yazılmalıdır.",
            findingText: "Rapor İngilizce yazılmıştır.",
            severity: "high" as const,
          },
        ],
        notes: "Dil kuralı ihlal edildi.",
      },
      true,
      { ...TURKISH_LANGUAGE_ANALYSIS, detectedLanguage: "İngilizce" }
    );

    expect(result.findings).toHaveLength(1);
    expect(result.compliant).toBe(false);
  });

  it("removes only the contradictory language finding and keeps unrelated high findings", () => {
    const result = normalizeSpecificationAnalysis(
      {
        compliant: false,
        findings: [
          {
            ruleText: "Rapor Türkçe dilinde yazılmalıdır.",
            findingText: "Dil kuralı ihlal edildi.",
            severity: "high" as const,
          },
          {
            ruleText: "En az iki bağımsız sensör kullanılmalıdır.",
            findingText: "Rapor tek sensör kullanıyor.",
            severity: "high" as const,
          },
        ],
        notes: "İki ihlal bulundu.",
      },
      true,
      TURKISH_LANGUAGE_ANALYSIS
    );

    expect(result.compliant).toBe(false);
    expect(result.findings).toEqual([
      {
        ruleText: "En az iki bağımsız sensör kullanılmalıdır.",
        findingText: "Rapor tek sensör kullanıyor.",
        severity: "high",
      },
    ]);
  });

  // A) specificationText undefined (hiç şartname yok)
  it("forces a safe/neutral result when there is no specification, even if the AI fabricated a violation", () => {
    const result = normalizeSpecificationAnalysis(FAKE_SPEC_VIOLATION, false);

    expect(result).toEqual({ compliant: true, findings: [], notes: NO_SPECIFICATION_NOTES });
  });

  // B) specificationText boş string — aynı davranış (hasSpecification hesaplanırken
  // zaten false'a düşer, ama helper'ın kendisi de false için aynı şekilde davranmalı)
  it("behaves identically regardless of why hasSpecification is false (empty string case included at the caller)", () => {
    const result = normalizeSpecificationAnalysis(FAKE_SPEC_VIOLATION, false);
    expect(result.compliant).toBe(true);
    expect(result.findings).toEqual([]);
  });

  // C) gerçek specificationText varsa AI'nın gerçek violation finding'i korunmalı
  it("leaves a real specification analysis completely untouched when a specification exists", () => {
    const result = normalizeSpecificationAnalysis(REAL_SPEC_VIOLATION, true);

    expect(result).toBe(REAL_SPEC_VIOLATION);
    expect(result).toEqual(REAL_SPEC_VIOLATION);
  });

  it("does not mutate the input object", () => {
    const input = { ...FAKE_SPEC_VIOLATION };
    normalizeSpecificationAnalysis(input, false);
    expect(input).toEqual(FAKE_SPEC_VIOLATION);
  });
});
