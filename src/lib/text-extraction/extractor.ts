export interface ExtractedDocument {
  markdown: string;
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
