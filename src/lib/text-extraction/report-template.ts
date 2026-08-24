import { getTextExtractor } from "./index";

/**
 * Yüklenen Rapor Şablonu PDF'inin gerçek metnini, AI evaluate'in beklediği
 * template.sections şemasına (id/title/expectedContent) uyacak tek bir
 * bölüm olarak döner. Deterministiktir — LLM çağrısı yapmaz, PDF'i
 * yapısal alt bölümlere ayırmaya çalışmaz; yüklenen şablonun tamamını tek
 * bir "beklenen içerik" referansı olarak kullanır. PDF'ten hiç metin
 * çıkarılamazsa (ör. taranmış görüntü) açık bir hata fırlatır — sahte bir
 * şablon asla üretilmez.
 */
export async function deriveTemplateSectionFromStorageKey(
  key: string
): Promise<{ title: string; expectedContent: string }> {
  const { markdown } = await getTextExtractor().extractFromStorageObject(key);
  const text = markdown.trim();
  if (!text) {
    throw new Error(
      "Rapor şablonu PDF'ten metin çıkarılamadı (taranmış görüntü tabanlı bir PDF olabilir)."
    );
  }
  return { title: "Rapor Şablonu", expectedContent: text };
}
