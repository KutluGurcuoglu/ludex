import { useAppStore, type AppState } from "@/store/useAppStore";
import type { FaqEntry } from "@/types";
import { simulateNetworkDelay } from "./delay";

export function getFaqs(): Promise<FaqEntry[]> {
  return simulateNetworkDelay(useAppStore.getState().faqs);
}

export function addFaqEntry(input: Parameters<AppState["addFaqEntry"]>[0]): Promise<FaqEntry> {
  const created = useAppStore.getState().addFaqEntry(input);
  return simulateNetworkDelay(created);
}

export function updateFaqEntry(
  id: string,
  updates: Parameters<AppState["updateFaqEntry"]>[1],
): Promise<void> {
  useAppStore.getState().updateFaqEntry(id, updates);
  return simulateNetworkDelay(undefined);
}

export function deleteFaqEntry(id: string): Promise<void> {
  useAppStore.getState().deleteFaqEntry(id);
  return simulateNetworkDelay(undefined);
}
