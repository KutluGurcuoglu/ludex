import type { JudgeEvaluation, ScoreCriterion } from "@/types";

/** İki veya daha fazla hakemin puanları bu kadar puandan fazla ayrışırsa admin uyarılır. */
export const SCORE_DEVIATION_THRESHOLD = 15;

export interface EvaluationAggregate {
  judgeCount: number;
  averageTotal: number;
  criteriaAverages: { criterionId: string; average: number }[];
  spread: number;
  highDeviation: boolean;
  evaluations: JudgeEvaluation[];
}

/** Bir rapora ait, birden fazla hakemin tamamladığı değerlendirmeleri ortalar ve büyük
 * sapmaları işaretler. Tek hakem varsa ortalama, o hakemin kendi puanına eşittir. */
export function aggregateEvaluations(
  evaluations: JudgeEvaluation[],
  criteria: ScoreCriterion[],
): EvaluationAggregate | null {
  const submitted = evaluations.filter((e) => e.status === "submitted");
  if (submitted.length === 0) return null;

  const totals = submitted.map((e) => e.totalScore);
  const averageTotal = totals.reduce((sum, t) => sum + t, 0) / totals.length;
  const spread = Math.max(...totals) - Math.min(...totals);

  const criteriaAverages = criteria.map((c) => {
    const scores = submitted.map(
      (e) => e.criteriaScores.find((cs) => cs.criterionId === c.id)?.score ?? 0,
    );
    return {
      criterionId: c.id,
      average: scores.reduce((sum, s) => sum + s, 0) / scores.length,
    };
  });

  return {
    judgeCount: submitted.length,
    averageTotal,
    criteriaAverages,
    spread,
    highDeviation: submitted.length >= 2 && spread >= SCORE_DEVIATION_THRESHOLD,
    evaluations: submitted,
  };
}
