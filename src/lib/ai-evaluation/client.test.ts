import { describe, expect, it, vi } from "vitest";

const { fetchCloudflareStructuredJson } = vi.hoisted(() => ({
  fetchCloudflareStructuredJson: vi.fn(),
}));

vi.mock("@/lib/ai-shared/cloudflare-workers-ai", () => ({
  fetchCloudflareStructuredJson,
}));

import { callAiEvaluation } from "./client";

const VALID_OUTPUT = {
  languageAnalysis: {
    detectedLanguage: "Türkçe",
    confidence: 0.95,
    summary: "Rapor Türkçe yazılmış.",
    issues: [],
  },
  specificationAnalysis: { compliant: true, findings: [], notes: "Şartname yüklenmemiş." },
  templateAnalysis: { compliant: true, missingSections: [], notes: "Şablona uygun." },
  headingContentAnalysis: [
    { sectionId: "sec-1", headingPresent: true, contentMatchesExpectation: true, notes: "Uygun." },
  ],
  categoryFit: { fit: true, reason: "Kategoriyle uyumlu." },
  criteriaEvaluations: [{ criterionId: "c1", score: 17, reason: "Problem net tanımlanmış." }],
  strengths: ["Güçlü yön."],
  areasForImprovement: ["Geliştirilebilir alan."],
  recommendations: ["Öneri."],
};

describe("callAiEvaluation", () => {
  it("uses the fast instruct model and the reduced max token budget for full report evaluation", async () => {
    fetchCloudflareStructuredJson.mockResolvedValue(VALID_OUTPUT);

    await callAiEvaluation("system prompt", "user prompt");

    expect(fetchCloudflareStructuredJson).toHaveBeenCalledTimes(1);
    const [, , , options] = fetchCloudflareStructuredJson.mock.calls[0];
    expect(options).toEqual({
      model: "@cf/meta/llama-3.1-8b-instruct-fast",
      maxTokens: 8192,
    });
  });

  it("still returns the validated evaluation output on a successful call", async () => {
    fetchCloudflareStructuredJson.mockResolvedValue(VALID_OUTPUT);

    const result = await callAiEvaluation("system prompt", "user prompt");

    expect(result.criteriaEvaluations).toEqual(VALID_OUTPUT.criteriaEvaluations);
  });

  it("throws when the AI output does not match evaluationOutputSchema", async () => {
    fetchCloudflareStructuredJson.mockResolvedValue({ nonsense: true });

    await expect(callAiEvaluation("system prompt", "user prompt")).rejects.toThrow(
      "Invalid AI evaluation output"
    );
  });
});
