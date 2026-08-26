import type { CriterionEvaluation } from "./schema";

type CriterionDefinition = { id: string; maxScore?: number };

export class InvalidCriteriaEvaluationsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCriteriaEvaluationsError";
  }
}

/** Validates AI criterion results against the backend-owned criterion list. */
export function validateCriteriaEvaluations(
  evaluations: CriterionEvaluation[],
  criteria: CriterionDefinition[]
): void {
  const expected = new Map(criteria.map((criterion) => [criterion.id, criterion]));
  const seen = new Set<string>();

  for (const evaluation of evaluations) {
    const criterion = expected.get(evaluation.criterionId);
    if (!criterion) {
      throw new InvalidCriteriaEvaluationsError(
        `Unknown criterionId: ${evaluation.criterionId}`
      );
    }
    if (seen.has(evaluation.criterionId)) {
      throw new InvalidCriteriaEvaluationsError(
        `Duplicate criterionId: ${evaluation.criterionId}`
      );
    }
    seen.add(evaluation.criterionId);

    if (typeof evaluation.score === "number") {
      if (evaluation.score < 0) {
        throw new InvalidCriteriaEvaluationsError(
          `Negative score for criterionId: ${evaluation.criterionId}`
        );
      }
      if (criterion.maxScore !== undefined && evaluation.score > criterion.maxScore) {
        throw new InvalidCriteriaEvaluationsError(
          `Score exceeds maxScore for criterionId: ${evaluation.criterionId}`
        );
      }
    }
  }

  if (seen.size !== expected.size || criteria.some((criterion) => !seen.has(criterion.id))) {
    throw new InvalidCriteriaEvaluationsError("Missing criterionId");
  }
}
