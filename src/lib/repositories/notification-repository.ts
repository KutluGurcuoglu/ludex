import { db } from "@/lib/db";
import type { AppNotification } from "@/types";

export interface NotificationRepository {
  listForUser(userId: string): Promise<AppNotification[]>;
  create(input: {
    userId: string;
    kind: AppNotification["kind"];
    title: string;
    body?: string;
    link?: string;
    reportId?: string;
  }): Promise<void>;
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

  async create(input: Parameters<NotificationRepository["create"]>[0]): Promise<void> {
    if (!input.reportId) {
      await db.notification.create({
        data: {
          userId: input.userId,
          kind: input.kind,
          title: input.title,
          body: input.body,
          link: input.link,
        },
      });
      return;
    }

    await db.notification.upsert({
      where: {
        userId_kind_reportId: {
          userId: input.userId,
          kind: input.kind,
          // Evaluation notifications use reportId for idempotency. Announcement
          // notifications intentionally have no report association.
          reportId: input.reportId ?? "",
        },
      },
      update: {},
      create: {
        userId: input.userId,
        kind: input.kind,
        title: input.title,
        body: input.body,
        link: input.link,
        reportId: input.reportId,
      },
    });
  }
}

let notificationRepository: NotificationRepository | undefined;

export function getNotificationRepository(): NotificationRepository {
  if (!notificationRepository) notificationRepository = new PrismaNotificationRepository();
  return notificationRepository;
}
