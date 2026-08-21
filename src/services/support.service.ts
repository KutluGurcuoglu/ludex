import { useAppStore, type AppState } from "@/store/useAppStore";
import type { SupportMessage } from "@/types";
import { simulateNetworkDelay } from "./delay";

export function getSupportMessages(): Promise<SupportMessage[]> {
  return simulateNetworkDelay(useAppStore.getState().supportMessages);
}

export function sendSupportMessage(
  userId: string,
  subject: string,
  message: string,
): Promise<void> {
  useAppStore.getState().sendSupportMessage(userId, subject, message);
  return simulateNetworkDelay(undefined);
}

export function resolveSupportMessage(id: string): Promise<void> {
  useAppStore.getState().resolveSupportMessage(id);
  return simulateNetworkDelay(undefined);
}

export function sendAnnouncement(
  input: Parameters<AppState["sendAnnouncement"]>[0],
): Promise<number> {
  const count = useAppStore.getState().sendAnnouncement(input);
  return simulateNetworkDelay(count);
}
