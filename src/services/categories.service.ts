import { useAppStore, type AppState } from "@/store/useAppStore";
import type { Category, CompetitionDocument, ScoreCriterion } from "@/types";
import { simulateNetworkDelay } from "./delay";

export async function getCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Kategoriler alınamadı.");
  return data.categories;
}

export async function createCategory(
  input: Parameters<AppState["addCategory"]>[0],
): Promise<Category> {
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Kategori oluşturulamadı.");
  return data.category;
}

export async function updateCategory(
  id: string,
  updates: Parameters<AppState["updateCategory"]>[1],
): Promise<void> {
  const res = await fetch(`/api/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Kategori güncellenemedi.");
  }
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

export async function setCategorySubmissionWindow(
  id: string,
  opensAt: string | null,
  closesAt: string | null,
): Promise<void> {
  const res = await fetch(`/api/categories/${id}/submission-window`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ opensAt, closesAt }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Gönderim penceresi güncellenemedi.");
  }
}
