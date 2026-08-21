import { describe, expect, it } from "vitest";
import { aggregateEvaluations } from "./scoring";
import type { JudgeEvaluation, ScoreCriterion } from "@/types";

const CRITERIA: ScoreCriterion[] = [{ id: "crit-content", label: "İçerik", maxScore: 50 }];

function evaluation(judgeId: string, totalScore: number, contentScore: number): JudgeEvaluation {
  return {
    id: `eval-${judgeId}`,
    reportId: "report-1",
    judgeId,
    criteriaScores: [{ criterionId: "crit-content", score: contentScore }],
    totalScore,
    overallComment: "",
    status: "submitted",
    updatedAt: new Date(0).toISOString(),
  };
}

describe("aggregateEvaluations", () => {
  it("returns null when no evaluation has been submitted", () => {
    expect(aggregateEvaluations([], CRITERIA)).toBeNull();
    expect(
      aggregateEvaluations([{ ...evaluation("judge-1", 40, 40), status: "draft" }], CRITERIA),
    ).toBeNull();
  });

  it("averages a single judge's score with itself and never flags deviation", () => {
    const result = aggregateEvaluations([evaluation("judge-1", 42, 20)], CRITERIA);
    expect(result?.judgeCount).toBe(1);
    expect(result?.averageTotal).toBe(42);
    expect(result?.highDeviation).toBe(false);
  });

  it("averages two judges and flags a large score spread", () => {
    const result = aggregateEvaluations(
      [evaluation("judge-1", 90, 45), evaluation("judge-2", 60, 30)],
      CRITERIA,
    );
    expect(result?.judgeCount).toBe(2);
    expect(result?.averageTotal).toBe(75);
    expect(result?.criteriaAverages[0].average).toBe(37.5);
    expect(result?.spread).toBe(30);
    expect(result?.highDeviation).toBe(true);
  });

  it("does not flag deviation when two judges agree closely", () => {
    const result = aggregateEvaluations(
      [evaluation("judge-1", 80, 40), evaluation("judge-2", 78, 39)],
      CRITERIA,
    );
    expect(result?.highDeviation).toBe(false);
  });
});
