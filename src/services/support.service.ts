import { useAppStore } from "@/store/useAppStore";
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

export async function sendAnnouncement(input: {
  audience: "contestants" | "judges" | "both" | "custom";
  userIds?: string[];
  categoryId?: string;
  title: string;
  body?: string;
}): Promise<number> {
  const response = await fetch("/api/announcements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Duyuru gönderilemedi.");
  return data.count;
}
