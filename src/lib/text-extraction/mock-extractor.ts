import type { ExtractedDocument, TextExtractor } from "./extractor";

/** LLAMA_CLOUD_API_KEY henüz tanımlanmadığında kullanılan geliştirme amaçlı sahte extractor. */
export class MockTextExtractor implements TextExtractor {
  async extractFromR2Object(key: string): Promise<ExtractedDocument> {
    return {
      markdown: [
        "# Mock Rapor İçeriği",
        "",
        `Bu, \`${key}\` anahtarlı PDF için LLAMA_CLOUD_API_KEY tanımlı olmadığından üretilen`,
        "sahte (mock) bir çıktıdır. Gerçek bir LlamaParse API anahtarı .env dosyasına",
        "eklendiğinde bu extractor otomatik olarak LlamaParseTextExtractor ile değiştirilir",
        "ve rapordan gerçek metin çıkarılır.",
      ].join("\n"),
    };
  }
}
