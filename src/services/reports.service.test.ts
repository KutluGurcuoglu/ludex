import { afterEach, describe, expect, it, vi } from "vitest";
import { runAiAnalysis } from "./reports.service";

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * admin/pool/page.tsx'teki handleBulkAnalyze(), her rapor için
 * runAiAnalysis()'i sırayla çağırır ve sonucu bir try/catch/finally içinde
 * ele alır: başarı sayaç artırır, hata sayaç artırıp loglar ama batch'i
 * durdurmaz, finally o raporu analyzingReportIds'ten çıkarır. Bu testler,
 * bu davranışın dayandığı temel sözleşmeyi doğrular: runAiAnalysis başarıda
 * sessizce döner, başarısızlıkta HER ZAMAN gerçek bir Error ile reddeder
 * (asla asılı kalmaz/sessizce yutmaz) — böylece çağıran taraftaki
 * try/catch/finally güvenilir şekilde çalışabilir.
 */
describe("runAiAnalysis", () => {
  it("resolves without throwing when /evaluate succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true }) }))
    );

    await expect(runAiAnalysis("report-1")).resolves.toBeUndefined();
  });

  it("rejects with the server's error message when /evaluate fails, instead of hanging or swallowing it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: "AI değerlendirmesi başarısız oldu." }),
      }))
    );

    await expect(runAiAnalysis("report-1")).rejects.toThrow("AI değerlendirmesi başarısız oldu.");
  });

  it("falls back to a generic message when the failure response has no JSON body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("not json");
        },
      }))
    );

    await expect(runAiAnalysis("report-1")).rejects.toThrow("AI analizi başarısız oldu.");
  });

  it("surfaces the understandable timeout message returned by the server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 504,
        json: async () => ({
          error: "AI sağlayıcısı 90 saniye içinde yanıt veremedi. Lütfen tekrar deneyin.",
        }),
      }))
    );

    await expect(runAiAnalysis("report-1")).rejects.toThrow(
      "AI sağlayıcısı 90 saniye içinde yanıt veremedi. Lütfen tekrar deneyin."
    );
  });
});
