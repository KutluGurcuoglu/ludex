import { useAppStore, type AppState } from "@/store/useAppStore";
import type { Category, CompetitionDocument } from "@/types";
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
): Promise<void> {
  useAppStore.getState().setCategorySpecification(id, doc);
  return simulateNetworkDelay(undefined);
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
