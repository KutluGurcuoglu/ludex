import { describe, expect, it } from "vitest";
import { deriveAiFeedback } from "./ai-feedback";
import type { EvaluationOutput } from "@/lib/ai-evaluation/schema";

const AI_EVALUATION = {
  strengths: ["Net problem tanımı"],
  areasForImprovement: ["Test kapsamı sınırlı"],
  recommendations: ["Ek senaryolarla test edilmeli"],
} as unknown as EvaluationOutput;

describe("deriveAiFeedback", () => {
  it("returns null before any evaluation is published", () => {
    const feedback = deriveAiFeedback(
      { aiEvaluation: AI_EVALUATION },
      [{ visibleToContestant: false }]
    );
    expect(feedback).toBeNull();
  });

  it("returns null when there is no evaluation at all", () => {
    const feedback = deriveAiFeedback({ aiEvaluation: AI_EVALUATION }, []);
    expect(feedback).toBeNull();
  });

  it("returns null when the AI evaluation never ran, even if published", () => {
    const feedback = deriveAiFeedback({ aiEvaluation: null }, [{ visibleToContestant: true }]);
    expect(feedback).toBeNull();
  });

  it("returns the strengths/areasForImprovement/recommendations once published", () => {
    const feedback = deriveAiFeedback(
      { aiEvaluation: AI_EVALUATION },
      [{ visibleToContestant: true }]
    );
    expect(feedback).toEqual({
      strengths: AI_EVALUATION.strengths,
      areasForImprovement: AI_EVALUATION.areasForImprovement,
      recommendations: AI_EVALUATION.recommendations,
    });
  });

  it("publishes as soon as at least one of multiple evaluations is visible", () => {
    const feedback = deriveAiFeedback(
      { aiEvaluation: AI_EVALUATION },
      [{ visibleToContestant: false }, { visibleToContestant: true }]
    );
    expect(feedback).not.toBeNull();
  });

  it("never includes similarity details in the contestant-facing feedback", () => {
    const feedback = deriveAiFeedback(
      { aiEvaluation: AI_EVALUATION },
      [{ visibleToContestant: true }]
    );
    expect(feedback).not.toHaveProperty("similarReports");
    expect(feedback).not.toHaveProperty("similarityScore");
  });
});
