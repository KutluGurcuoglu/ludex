import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("LLAMA_CLOUD_API_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getTextExtractor", () => {
  it("uses LlamaParseTextExtractor when LLAMA_CLOUD_API_KEY is set", async () => {
    vi.stubEnv("LLAMA_CLOUD_API_KEY", "test-key");
    const { getTextExtractor } = await import("./index");
    const { LlamaParseTextExtractor } = await import("./llamaparse-extractor");
    expect(getTextExtractor()).toBeInstanceOf(LlamaParseTextExtractor);
  });

  it("uses the real local PDF extractor (not a mock) when LLAMA_CLOUD_API_KEY is unset", async () => {
    const { getTextExtractor } = await import("./index");
    const { LocalPdfTextExtractor } = await import("./local-pdf-extractor");
    expect(getTextExtractor()).toBeInstanceOf(LocalPdfTextExtractor);
  });
});
