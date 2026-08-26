import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CloudflareAiTimeoutError, fetchCloudflareStructuredJson } from "./cloudflare-workers-ai";

beforeEach(() => {
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "test-account");
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "test-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("fetchCloudflareStructuredJson", () => {
  it("rejects with a clear timeout error when Cloudflare never responds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          // Gerçek E2E'de gözlenen davranışı simüle eder: Cloudflare hiç
          // yanıt vermez, bağlantı açık kalır. Gerçek fetch()'in
          // AbortSignal.timeout() ile aboneliği burada da işletilir.
          init.signal?.addEventListener("abort", () => {
            reject((init.signal as AbortSignal).reason);
          });
        })
      )
    );

    const request = fetchCloudflareStructuredJson("system", "user", {}, { timeoutMs: 30 });
    await expect(request).rejects.toBeInstanceOf(CloudflareAiTimeoutError);
    await expect(request).rejects.toThrow("Cloudflare Workers AI request timed out.");
  });

  it("preserves the existing behavior for a successful Cloudflare response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          result: {
            choices: [{ message: { content: JSON.stringify({ hello: "world" }) } }],
          },
        }),
      }))
    );

    const result = await fetchCloudflareStructuredJson("system", "user", {});
    expect(result).toEqual({ hello: "world" });
  });

  it("still surfaces Cloudflare's own failure response distinctly from a timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          errors: [{ code: 1, message: "internal error" }],
        }),
      }))
    );

    await expect(fetchCloudflareStructuredJson("system", "user", {})).rejects.toThrow(
      /Cloudflare Workers AI request failed/
    );
  });
});
