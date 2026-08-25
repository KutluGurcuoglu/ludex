import { describe, expect, it } from "vitest";
import { getAiAnalysisStatus } from "./ai-analysis-status";
import type { AIEvaluationOutput } from "@/types";

const FAKE_EVALUATION = {} as AIEvaluationOutput;

describe("getAiAnalysisStatus", () => {
  it("returns 'pending' when there is no aiEvaluation yet", () => {
    expect(getAiAnalysisStatus({ aiEvaluation: null, aiAnalysisStale: false })).toBe("pending");
    expect(getAiAnalysisStatus({ aiEvaluation: undefined, aiAnalysisStale: undefined })).toBe(
      "pending"
    );
  });

  it("returns 'completed' when aiEvaluation exists and is not stale", () => {
    expect(getAiAnalysisStatus({ aiEvaluation: FAKE_EVALUATION, aiAnalysisStale: false })).toBe(
      "completed"
    );
  });

  it("returns 'stale' when aiEvaluation exists but aiAnalysisStale is true", () => {
    expect(getAiAnalysisStatus({ aiEvaluation: FAKE_EVALUATION, aiAnalysisStale: true })).toBe(
      "stale"
    );
  });
});
