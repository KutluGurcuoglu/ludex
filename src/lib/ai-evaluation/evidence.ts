import { foldTurkish } from "@/lib/pdf-highlight";
import type { ExtractedPage } from "@/lib/text-extraction/extractor";

export interface VerifiedLocation {
  page: number;
  excerpt: string;
}

/**
 * AI'nın ürettiği pageNumber/exactExcerpt iddiasını, raporun GERÇEK sayfa
 * metnine karşı doğrular. Sunucu, modelin söylediğine körü körüne güvenmez:
 * sayfa yoksa, alıntı boşsa ya da o sayfanın gerçek metninde (Türkçe
 * karakter-duyarsız) geçmiyorsa `null` döner — hiçbir zaman kanıt uydurmaz.
 * Böyle bir bulgu, PDF üzerinde işaretlenemeyen bir bulgu olarak ele alınır.
 */
export function verifyExcerpt(
  pages: ExtractedPage[] | null | undefined,
  pageNumber: number | undefined,
  exactExcerpt: string | undefined
): VerifiedLocation | null {
  if (!pageNumber || !exactExcerpt || !exactExcerpt.trim()) return null;
  if (!pages || pages.length === 0) return null;

  const excerpt = exactExcerpt.trim();
  // Tek bir "#" gibi bir sembol, sayfanın gerçek metninde teknik olarak
  // geçse bile (ör. bir başlık sayfası grafiğinin OCR/ayrıştırma artığı)
  // hakeme hiçbir anlamlı bağlam sunmaz — en az birkaç harf/rakam
  // içermeyen alıntılar doğrulanmaz.
  if (excerpt.replace(/[^\p{L}\p{N}]/gu, "").length < 3) return null;

  const page = pages.find((p) => p.pageNumber === pageNumber);
  if (!page) return null;

  const foundOnClaimedPage = foldTurkish(page.text).includes(foldTurkish(excerpt));
  if (foundOnClaimedPage) {
    return { page: pageNumber, excerpt };
  }

  return null;
}
