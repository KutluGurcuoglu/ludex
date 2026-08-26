import type { AppNotification } from "@/types";

export async function getNotifications(): Promise<AppNotification[]> {
  const response = await fetch("/api/notifications");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Bildirimler alınamadı.");
  return data.notifications;
}
