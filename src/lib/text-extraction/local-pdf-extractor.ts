import { getStorageProvider } from "@/lib/storage";
import type { ExtractedDocument, TextExtractor } from "./extractor";

/**
 * LLAMA_CLOUD_API_KEY tanımlı olmadığında kullanılan, ücretsiz ve tamamen
 * yerel bir gerçek metin çıkarma implementasyonu. `pdfjs-dist` (bu projede
 * zaten react-pdf'in bağımlılığı olarak kurulu, Mozilla tarafından aktif
 * geliştirilen bir kütüphane) doğrudan Node.js server runtime'ında
 * "legacy" build'i üzerinden çalıştırılır — ek bir paket veya native
 * bağımlılık (ör. canvas) gerekmez, yalnızca metin çıkarımı yapılır,
 * render edilmez.
 */
export class LocalPdfTextExtractor implements TextExtractor {
  async extractFromStorageObject(key: string): Promise<ExtractedDocument> {
    const bytes = await getStorageProvider().getObjectBytes(key);

    // pdfjs-dist normalde ayrı bir worker dosyasını (`pdf.worker.mjs`) kendi
    // konumuna göre relative bir yoldan dinamik `import()` ile yüklemeye
    // çalışır; Next.js'in server bundling'i node_modules'ü vendor-chunk'lara
    // taşıdığı için bu yol production build'inde artık geçerli olmuyor ve
    // "Setting up fake worker failed" hatasıyla sessizce patlıyor. Çözüm,
    // pdf.js'in kendi belgelediği Node.js deseni: worker modülünü normal bir
    // (webpack'in bundle'layabildiği) import ile önceden yükleyip
    // globalThis.pdfjsWorker'a atamak — pdf.js bunu bulunca kendi relative
    // import denemesini hiç yapmıyor.
    const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    (globalThis as typeof globalThis & { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker;

    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const doc = await getDocument({
      data: bytes,
      useSystemFonts: true,
      isEvalSupported: false,
    }).promise;

    try {
      const pageTexts: string[] = [];
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
        const page = await doc.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .trim();
        pageTexts.push(pageText);
      }

      const markdown = pageTexts.join("\n\n").trim();
      if (!markdown) {
        throw new Error(
          "PDF'ten hiç metin çıkarılamadı (taranmış görüntü tabanlı bir PDF olabilir)."
        );
      }
      const pages = pageTexts.map((text, index) => ({ pageNumber: index + 1, text }));
      return { markdown, pages };
    } finally {
      await doc.destroy();
    }
  }
}
