import { afterEach, describe, expect, it, vi } from "vitest";
import { getAIAnalysis } from "./ai-analysis.service";

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * evaluation-workspace.tsx'teki handleStartAnalysis(), "checking" durumunda
 * takılı kalmamak için getAIAnalysis()'in reddettiği her durumda bir Error
 * (ve .message) almayı bekler. Bu testler, sunucu tarafı Cloudflare timeout
 * fix'inden SONRA /evaluate'in artık sonsuza kadar asılı kalmadan gerçek bir
 * hata yanıtı döndüğü senaryoda bu sözleşmenin hâlâ doğru çalıştığını doğrular.
 */
describe("getAIAnalysis", () => {
  it("rejects with the server's error message when /evaluate responds with a failure status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: "AI değerlendirmesi başarısız oldu." }),
      }))
    );

    await expect(getAIAnalysis("report-1")).rejects.toThrow(
      "AI değerlendirmesi başarısız oldu."
    );
  });

  it("propagates a network-level fetch rejection instead of hanging or swallowing it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network error");
      })
    );

    await expect(getAIAnalysis("report-1")).rejects.toThrow("network error");
  });
});
