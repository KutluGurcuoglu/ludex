export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedDocument {
  markdown: string;
  /**
   * Sayfa bazlı düz metin. AI'ya sayfa numarası + gerçek alıntı üretebilmesi
   * için raporun "[PAGE n]" işaretli haliyle verilebilmesini ve dönen
   * pageNumber/exactExcerpt'in gerçekten o sayfada var olup olmadığının
   * doğrulanabilmesini sağlar (bkz. src/lib/ai-evaluation/evidence.ts).
   * En az bir eleman içerir; sayfa ayrımı yapılamıyorsa tüm metin tek bir
   * sözde sayfa (pageNumber: 1) olarak döner — hiçbir zaman boş kalmaz.
   */
  pages: ExtractedPage[];
}

/**
 * Depolanmış bir PDF nesnesinden metin çıkaran servise port (R2 ya da yerel
 * depolama — hangisi aktifse, bkz. src/lib/storage). LLAMA_CLOUD_API_KEY
 * tanımlıysa gerçek LlamaParse implementasyonu, tanımlı değilse yerel
 * pdfjs-dist tabanlı gerçek bir extractor kullanılır (bkz.
 * src/lib/text-extraction/index.ts) — hiçbir zaman sahte/mock metin üretilmez.
 */
export interface TextExtractor {
  extractFromStorageObject(key: string): Promise<ExtractedDocument>;
}
