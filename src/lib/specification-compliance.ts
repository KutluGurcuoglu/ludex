export interface NormalizableSpecificationAnalysis {
  compliant: boolean;
  findings: unknown[];
  notes: string;
}

export const NO_SPECIFICATION_NOTES =
  "Şartname yüklenmediği için şartname uygunluğu değerlendirilmedi.";

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
  hasSpecification: boolean
): T {
  if (hasSpecification) return specificationAnalysis;
  return {
    ...specificationAnalysis,
    compliant: true,
    findings: [],
    notes: NO_SPECIFICATION_NOTES,
  };
}
