import { LlamaParseTextExtractor } from "./llamaparse-extractor";
import { LocalPdfTextExtractor } from "./local-pdf-extractor";

export type { ExtractedDocument, TextExtractor } from "./extractor";

/**
 * LLAMA_CLOUD_API_KEY tanımlıysa gerçek LlamaParse kullanılır; tanımlı
 * değilse yerel, ücretsiz bir gerçek PDF metin çıkarıcıya (pdfjs-dist)
 * düşülür. İkisi de gerçek metin üretir — production/runtime path'inde
 * sahte/mock bir çıktı asla dönmez.
 */
export function getTextExtractor() {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  return apiKey ? new LlamaParseTextExtractor(apiKey) : new LocalPdfTextExtractor();
}
