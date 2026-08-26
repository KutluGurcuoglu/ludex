import { db } from "@/lib/db";
import type { AppNotification } from "@/types";

export interface NotificationRepository {
  listForUser(userId: string): Promise<AppNotification[]>;
}

class PrismaNotificationRepository implements NotificationRepository {
  async listForUser(userId: string): Promise<AppNotification[]> {
    const rows = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      kind: row.kind as AppNotification["kind"],
      title: row.title,
      body: row.body ?? undefined,
      link: row.link ?? undefined,
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt?.toISOString() ?? null,
      channel: "in_app",
    }));
  }
}

let notificationRepository: NotificationRepository | undefined;

export function getNotificationRepository(): NotificationRepository {
  if (!notificationRepository) notificationRepository = new PrismaNotificationRepository();
  return notificationRepository;
}
