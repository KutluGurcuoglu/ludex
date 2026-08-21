import { useAppStore, type AppState } from "@/store/useAppStore";
import type { JudgeEvaluation, ScoreCriterion } from "@/types";
import { simulateNetworkDelay } from "./delay";

export function getEvaluations(): Promise<JudgeEvaluation[]> {
  return simulateNetworkDelay(useAppStore.getState().evaluations);
}

export function getScoreCriteria(): Promise<ScoreCriterion[]> {
  return simulateNetworkDelay(useAppStore.getState().scoreCriteria);
}

export function saveEvaluation(evaluation: JudgeEvaluation): Promise<void> {
  useAppStore.getState().saveEvaluation(evaluation);
  return simulateNetworkDelay(undefined);
}

export function addScoreCriterion(
  input: Parameters<AppState["addScoreCriterion"]>[0],
): Promise<ScoreCriterion> {
  const created = useAppStore.getState().addScoreCriterion(input);
  return simulateNetworkDelay(created);
}

export function updateScoreCriterion(
  id: string,
  updates: Parameters<AppState["updateScoreCriterion"]>[1],
): Promise<void> {
  useAppStore.getState().updateScoreCriterion(id, updates);
  return simulateNetworkDelay(undefined);
}

export function deleteScoreCriterion(id: string): Promise<void> {
  useAppStore.getState().deleteScoreCriterion(id);
  return simulateNetworkDelay(undefined);
}
