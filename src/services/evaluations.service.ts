import type { JudgeEvaluation, ScoreCriterion } from "@/types";

export async function getEvaluations(): Promise<JudgeEvaluation[]> {
  const res = await fetch("/api/evaluations");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Değerlendirmeler alınamadı.");
  return data.evaluations;
}

export async function getScoreCriteria(): Promise<ScoreCriterion[]> {
  const res = await fetch("/api/score-criteria");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Değerlendirme kriterleri alınamadı.");
  return data.criteria;
}

export async function saveEvaluation(evaluation: JudgeEvaluation): Promise<void> {
  const res = await fetch(`/api/reports/${evaluation.reportId}/evaluations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      criteriaScores: evaluation.criteriaScores,
      overallComment: evaluation.overallComment,
      status: evaluation.status,
      disqualificationRecommendation: evaluation.disqualificationRecommendation ?? null,
    }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Değerlendirme kaydedilemedi.");
  }
}

export async function resolveDisqualification(
  evaluationId: string,
  decision: "upheld" | "dismissed",
): Promise<void> {
  const res = await fetch(`/api/evaluations/${evaluationId}/disqualification-decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Karar kaydedilemedi.");
  }
}

export async function approveEvaluation(evaluationId: string): Promise<void> {
  const res = await fetch(`/api/evaluations/${evaluationId}/approve`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Değerlendirme onaylanamadı.");
  }
}

export async function addScoreCriterion(input: {
  label: string;
  maxScore: number;
  description?: string;
}): Promise<ScoreCriterion> {
  const res = await fetch("/api/score-criteria", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Kriter oluşturulamadı.");
  return data.criterion;
}

export async function updateScoreCriterion(
  id: string,
  updates: { label?: string; maxScore?: number; description?: string },
): Promise<void> {
  const res = await fetch(`/api/score-criteria/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Kriter güncellenemedi.");
  }
}

export async function deleteScoreCriterion(id: string): Promise<void> {
  const res = await fetch(`/api/score-criteria/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Kriter silinemedi.");
  }
}
