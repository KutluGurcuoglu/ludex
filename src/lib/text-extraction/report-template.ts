import { getTextExtractor } from "./index";
import { analyzeTemplateSections } from "@/lib/ai-template-analysis/analyze";

/** PDF'ten hiç metin çıkarılamadığında (ör. taranmış görüntü tabanlı PDF) fırlatılır. */
export class TemplateTextExtractionError extends Error {}

/** Metin çıkarıldı ama AI şablonda hiçbir geçerli rapor bölümü bulamadığında fırlatılır. */
export class NoTemplateSectionsFoundError extends Error {}

export interface DerivedTemplateSection {
  title: string;
  expectedContent: string;
}

/**
 * Yüklenen Rapor Şablonu PDF'inin gerçek metnini mevcut text extraction
 * altyapısıyla çıkarır ve ai-template-analysis'in şablon bölümü analiz
 * çağrısıyla (yalnızca sections — kriter çağrısı tetiklenmez) şablondaki
 * gerçek leaf/standalone rapor bölümlerine ayırır. Sonuç, şablondaki sırayı
 * (AI çıktısındaki `order` alanı) koruyarak döner. PDF'ten hiç metin
 * çıkarılamazsa veya AI şablonda hiçbir bölüm bulamazsa hata fırlatır —
 * sahte/placeholder bir şablon bölümü asla üretilmez.
 */
export async function deriveTemplateSectionsFromStorageKey(
  key: string
): Promise<DerivedTemplateSection[]> {
  let markdown: string;
  try {
    ({ markdown } = await getTextExtractor().extractFromStorageObject(key));
  } catch (error) {
    throw new TemplateTextExtractionError(
      "Rapor şablonu PDF'ten metin çıkarılamadı (taranmış görüntü tabanlı bir PDF olabilir).",
      { cause: error }
    );
  }

  const text = markdown.trim();
  if (!text) {
    throw new TemplateTextExtractionError(
      "Rapor şablonu PDF'ten metin çıkarılamadı (taranmış görüntü tabanlı bir PDF olabilir)."
    );
  }

  const { sections } = await analyzeTemplateSections({ templateContent: text });
  if (sections.length === 0) {
    throw new NoTemplateSectionsFoundError(
      "AI, yüklenen şablonda geçerli bir rapor bölümü yapısı bulamadı."
    );
  }

  return [...sections]
    .sort((a, b) => a.order - b.order)
    .map((section) => ({ title: section.title, expectedContent: section.expectedContent }));
}
