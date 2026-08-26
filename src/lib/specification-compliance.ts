import type { LanguageAnalysis } from "@/lib/ai-evaluation/schema";

export interface NormalizableSpecificationAnalysis {
  compliant: boolean;
  findings: unknown[];
  notes: string;
}

export const NO_SPECIFICATION_NOTES =
  "Şartname yüklenmediği için şartname uygunluğu değerlendirilmedi.";

function comparableText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("tr-TR");
}

function isContradictoryLanguageFinding(
  finding: { ruleText: string },
  languageAnalysis: LanguageAnalysis
): boolean {
  if (languageAnalysis.confidence < 0.8) return false;

  const ruleText = comparableText(finding.ruleText);
  const detectedLanguage = comparableText(languageAnalysis.detectedLanguage.trim());
  if (!detectedLanguage || !ruleText.includes(detectedLanguage)) return false;

  // The detected language is used only as a consistency signal. The rule text
  // remains the source of the requirement; no language is globally assumed.
  return /\bdil\w*\b|\blanguage\w*\b|\byazil\w*\b|\bwritten\b/i.test(ruleText);
}

/** Removes only a high-confidence language finding that contradicts detection. */
export function normalizeLanguageContradictions<T extends NormalizableSpecificationAnalysis>(
  specificationAnalysis: T,
  languageAnalysis: LanguageAnalysis
): T {
  const findings = specificationAnalysis.findings.filter(
    (finding) =>
      !isContradictoryLanguageFinding(finding as { ruleText: string }, languageAnalysis)
  );

  if (findings.length === specificationAnalysis.findings.length) return specificationAnalysis;
  return {
    ...specificationAnalysis,
    compliant: findings.length === 0 ? true : specificationAnalysis.compliant,
    findings,
  };
}

/**
 * Admin bu kategori için henüz bir şartname yüklemediyse (hasSpecification
 * false), AI'nın specificationAnalysis için ne döndürdüğüne BAKILMAKSIZIN
 * sonucu güvenli/nötr bir duruma sabitler: compliant=true, findings=[],
 * notes="...değerlendirilmedi." — admin şartname yüklemediği için
 * yarışmacı bu yüzden asla "ihlal etmiş" sayılamaz.
 *
 * AI'nın ("Şartname yüklenmelidir" gibi) uydurduğu bir bulgu ne taze bir
 * analiz sonucunda ne de DB'de önceden kaydedilmiş (bu düzeltmeden önce
 * üretilmiş) eski bir AIAnalysis'te asla korunmamalı — bu yüzden bu
 * fonksiyon TEK bir yerden, hem sunucu tarafında (evaluate/route.ts —
 * persistence'tan ÖNCE) hem istemci tarafında (ai-analysis.service.ts —
 * hem taze POST yanıtı hem cache'lenmiş DB satırı okunurken) çağrılır;
 * ikisi de aynı kurala tabidir.
 */
export function normalizeSpecificationAnalysis<T extends NormalizableSpecificationAnalysis>(
  specificationAnalysis: T,
  hasSpecification: boolean,
  languageAnalysis?: LanguageAnalysis
): T {
  if (hasSpecification) {
    return languageAnalysis
      ? normalizeLanguageContradictions(specificationAnalysis, languageAnalysis)
      : specificationAnalysis;
  }
  return {
    ...specificationAnalysis,
    compliant: true,
    findings: [],
    notes: NO_SPECIFICATION_NOTES,
  };
}
