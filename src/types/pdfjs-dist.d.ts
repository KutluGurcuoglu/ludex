/**
 * pdfjs-dist'in worker giriş noktası kendi tip tanımlarını export etmiyor;
 * yalnızca globalThis.pdfjsWorker'a atamak için dinamik import ediliyor
 * (bkz. src/lib/text-extraction/local-pdf-extractor.ts).
 */
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs";
