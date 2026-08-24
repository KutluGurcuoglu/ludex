import { getStorageProvider } from "@/lib/storage";
import type { ExtractedDocument, ExtractedPage, TextExtractor } from "./extractor";

const API_BASE = "https://api.cloud.llamaindex.ai/api/v2/parse";
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 40; // ~2 dakika

interface UploadResponse {
  id: string;
}

interface JobStatus {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  error_message?: string | null;
}

interface JobStatusResponse {
  job: JobStatus;
}

interface LlamaParsePage {
  page?: number;
  pageNumber?: number;
  md?: string;
  text?: string;
  markdown?: string;
}

interface MarkdownResultResponse {
  job: JobStatus;
  markdown_full?: string;
  pages?: LlamaParsePage[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class LlamaParseTextExtractor implements TextExtractor {
  constructor(private readonly apiKey: string) {}

  async extractFromStorageObject(key: string): Promise<ExtractedDocument> {
    const pdfBytes = await getStorageProvider().getObjectBytes(key);
    const jobId = await this.startParseJob(pdfBytes, key);
    await this.waitForCompletion(jobId);
    return this.fetchResult(jobId);
  }

  private async startParseJob(pdfBytes: Uint8Array, key: string): Promise<string> {
    const filename = key.split("/").pop() ?? "report.pdf";
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }),
      filename
    );
    formData.append("configuration", JSON.stringify({ tier: "fast", version: "latest" }));

    const response = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(
        `LlamaParse yükleme hatası (${response.status}): ${await response.text()}`
      );
    }

    const data = (await response.json()) as UploadResponse;
    return data.id;
  }

  private async waitForCompletion(jobId: string): Promise<void> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      const response = await fetch(`${API_BASE}/${jobId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!response.ok) {
        throw new Error(`LlamaParse durum sorgusu hatası (${response.status})`);
      }

      const data = (await response.json()) as JobStatusResponse;
      if (data.job.status === "COMPLETED") return;
      if (data.job.status === "FAILED" || data.job.status === "CANCELLED") {
        throw new Error(
          `LlamaParse işi başarısız oldu: ${data.job.error_message ?? data.job.status}`
        );
      }

      await sleep(POLL_INTERVAL_MS);
    }

    throw new Error("LlamaParse işi zaman aşımına uğradı.");
  }

  /**
   * Sayfa bazlı sonucu mümkün olduğunca isteriz; LlamaParse'ın bu uçtaki
   * gerçek yanıt şekli garanti olmadığından `pages` alanını best-effort
   * normalize ederiz. API hiç sayfa ayrımı döndürmezse (veya şekli
   * beklenenden farklıysa) tüm belgeyi TEK bir sözde sayfa olarak döneriz —
   * asla hata fırlatmaz, asla sayfa uydurmaz.
   */
  private async fetchResult(jobId: string): Promise<ExtractedDocument> {
    const response = await fetch(`${API_BASE}/${jobId}?expand=markdown_full`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!response.ok) {
      throw new Error(`LlamaParse sonuç alma hatası (${response.status})`);
    }

    const data = (await response.json()) as MarkdownResultResponse;
    if (!data.markdown_full) {
      throw new Error("LlamaParse sonucunda markdown_full alanı bulunamadı.");
    }
    const markdown = data.markdown_full;

    const pages: ExtractedPage[] = [];
    if (Array.isArray(data.pages)) {
      for (let i = 0; i < data.pages.length; i++) {
        const p = data.pages[i];
        const pageNumber = p.page ?? p.pageNumber ?? i + 1;
        const text = (p.md ?? p.text ?? p.markdown ?? "").trim();
        if (text) pages.push({ pageNumber, text });
      }
    }

    return {
      markdown,
      pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: markdown }],
    };
  }
}
