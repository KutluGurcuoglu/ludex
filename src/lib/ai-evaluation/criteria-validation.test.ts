import { describe, expect, it } from "vitest";
import type { CategoryEvaluationCriterion } from "@/lib/repositories/category-repository";
import { InvalidCriteriaEvaluationsError, validateCriteriaEvaluations } from "./criteria-validation";

const CRITERIA: CategoryEvaluationCriterion[] = [
  { id: "c1", name: "Kriter 1", description: "Birinci kriter", maxScore: 10 },
  { id: "c2", name: "Kriter 2", description: "İkinci kriter", maxScore: 20 },
];

function evaluation(criterionId: string, score: number | null) {
  return { criterionId, score, reason: "Değerlendirildi." };
}

function expectInvalid(evaluations: ReturnType<typeof evaluation>[]) {
  expect(() => validateCriteriaEvaluations(evaluations, CRITERIA)).toThrow(
    InvalidCriteriaEvaluationsError
  );
}

describe("validateCriteriaEvaluations", () => {
  it("passes valid criteria", () => {
    expect(() =>
      validateCriteriaEvaluations([evaluation("c1", 8), evaluation("c2", null)], CRITERIA)
    ).not.toThrow();
  });

  it("rejects a missing criterion", () => {
    expectInvalid([evaluation("c1", 8)]);
  });

  it("rejects an unknown criterion", () => {
    expectInvalid([evaluation("c1", 8), evaluation("unknown", 5)]);
  });

  it("rejects a duplicate criterion", () => {
    expectInvalid([evaluation("c1", 8), evaluation("c1", 7), evaluation("c2", 10)]);
  });

  it("rejects a negative score", () => {
    expectInvalid([evaluation("c1", -1), evaluation("c2", 10)]);
  });

  it("rejects a score above maxScore", () => {
    expectInvalid([evaluation("c1", 11), evaluation("c2", 10)]);
  });

  it("accepts a score equal to maxScore", () => {
    expect(() =>
      validateCriteriaEvaluations([evaluation("c1", 10), evaluation("c2", 20)], CRITERIA)
    ).not.toThrow();
  });

  it("accepts criteria in a different order", () => {
    expect(() =>
      validateCriteriaEvaluations([evaluation("c2", 20), evaluation("c1", 10)], CRITERIA)
    ).not.toThrow();
  });
});
