export interface ExtractedDocument {
  markdown: string;
}

/**
 * R2'deki bir PDF nesnesinden metin çıkaran servise port.
 * LLAMA_CLOUD_API_KEY tanımlıysa gerçek LlamaParse implementasyonu,
 * tanımlı değilse geliştirme için mock implementasyonu kullanılır
 * (bkz. src/lib/text-extraction/index.ts).
 */
export interface TextExtractor {
  extractFromR2Object(key: string): Promise<ExtractedDocument>;
}
