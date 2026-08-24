import type { ReportRecord } from "@/lib/repositories/report-repository";

/**
 * AI'ya (evaluate ve copilot) raporu "[PAGE n]" işaretleyicileriyle verir —
 * sayfa numaraları gerçek extractedPages'ten gelir; bu sayede model gerçek
 * bir sayfa numarasına atıf yapabilir ve sunucu bunu doğrulayabilir (bkz.
 * evidence.ts). Tek kaynak — evaluate ve copilot route'ları aynı fonksiyonu
 * kullanır.
 */
export function toPageMarkedContent(report: ReportRecord): string {
  if (report.extractedPages && report.extractedPages.length > 0) {
    return report.extractedPages.map((p) => `[PAGE ${p.pageNumber}]\n${p.text}`).join("\n\n");
  }
  // Sayfa bazlı extraction'dan önce ingest edilmiş eski raporlar için geriye
  // dönük uyumluluk: tüm metni tek bir sözde sayfa olarak işaretle.
  return `[PAGE 1]\n${report.extractedText ?? ""}`;
}
