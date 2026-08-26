"use client";

import { Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore, useCurrentUser } from "@/store/useAppStore";

export function AnnouncementsCard() {
  const user = useCurrentUser();
  const notifications = useAppStore((state) => state.notifications);
  const announcements = notifications
    .filter((notification) => notification.userId === user?.id && notification.kind === "announcement")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  if (!user || announcements.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="size-4 text-primary" /> Duyurular
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {announcements.map((announcement) => (
          <div key={announcement.id} className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-semibold">{announcement.title}</p>
            {announcement.body && <p className="mt-1 text-sm text-muted-foreground">{announcement.body}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
