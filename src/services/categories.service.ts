import { useAppStore, type AppState } from "@/store/useAppStore";
import type { Category, CompetitionDocument, ScoreCriterion } from "@/types";
import { simulateNetworkDelay } from "./delay";

export function getCategories(): Promise<Category[]> {
  return simulateNetworkDelay(useAppStore.getState().categories);
}

export function createCategory(
  input: Parameters<AppState["addCategory"]>[0],
): Promise<Category> {
  const created = useAppStore.getState().addCategory(input);
  return simulateNetworkDelay(created);
}

export function updateCategory(
  id: string,
  updates: Parameters<AppState["updateCategory"]>[1],
): Promise<void> {
  useAppStore.getState().updateCategory(id, updates);
  return simulateNetworkDelay(undefined);
}

export function uploadCategorySpecification(
  id: string,
  doc: CompetitionDocument,
): Promise<Category | undefined> {
  useAppStore.getState().setCategorySpecification(id, doc);
  const updated = useAppStore.getState().categories.find((c) => c.id === id);
  return simulateNetworkDelay(updated);
}

export function uploadCategoryTemplate(id: string, doc: CompetitionDocument): Promise<void> {
  useAppStore.getState().setCategoryTemplate(id, doc);
  return simulateNetworkDelay(undefined);
}

export function setCategoryReleaseDate(id: string, releaseAt: string | null): Promise<void> {
  useAppStore.getState().setCategoryReleaseDate(id, releaseAt);
  return simulateNetworkDelay(undefined);
}

export function releaseCategoryResults(id: string): Promise<void> {
  useAppStore.getState().releaseCategoryResults(id);
  return simulateNetworkDelay(undefined);
}

export function setCategoryEvaluationDeadline(id: string, deadline: string | null): Promise<void> {
  useAppStore.getState().setCategoryEvaluationDeadline(id, deadline);
  return simulateNetworkDelay(undefined);
}

export function regenerateCategoryCriteria(id: string): Promise<ScoreCriterion[]> {
  const criteria = useAppStore.getState().regenerateCategoryCriteria(id);
  return simulateNetworkDelay(criteria);
}

export function addCategoryCriterion(
  categoryId: string,
  input: Parameters<AppState["addCategoryCriterion"]>[1],
): Promise<ScoreCriterion> {
  const created = useAppStore.getState().addCategoryCriterion(categoryId, input);
  return simulateNetworkDelay(created);
}

export function updateCategoryCriterion(
  categoryId: string,
  criterionId: string,
  updates: Parameters<AppState["updateCategoryCriterion"]>[2],
): Promise<void> {
  useAppStore.getState().updateCategoryCriterion(categoryId, criterionId, updates);
  return simulateNetworkDelay(undefined);
}

export function deleteCategoryCriterion(categoryId: string, criterionId: string): Promise<void> {
  useAppStore.getState().deleteCategoryCriterion(categoryId, criterionId);
  return simulateNetworkDelay(undefined);
}

export function setCategorySubmissionWindow(
  id: string,
  opensAt: string | null,
  closesAt: string | null,
): Promise<void> {
  useAppStore.getState().setCategorySubmissionWindow(id, opensAt, closesAt);
  return simulateNetworkDelay(undefined);
}
