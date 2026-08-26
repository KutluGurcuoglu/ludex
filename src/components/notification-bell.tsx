"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore, useCurrentUser } from "@/store/useAppStore";
import { getNotifications } from "@/services/notifications.service";

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

export function NotificationBell() {
  const user = useCurrentUser();
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead);
  const setNotifications = useAppStore((s) => s.setNotifications);
  const [open, setOpen] = useState(false);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    getNotifications().then(setNotifications).catch((error) => {
      console.error("Bildirimler yüklenemedi:", error);
    });
  }, [userId, setNotifications]);

  const myNotifications = useMemo(
    () =>
      user
        ? notifications
            .filter((n) => n.userId === user.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [],
    [notifications, user],
  );
  const unreadCount = myNotifications.filter((n) => !n.readAt).length;

  if (!user) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8" aria-label="Bildirimler">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-sm font-semibold">Bildirimler</span>
          {unreadCount > 0 && (
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => markAllNotificationsRead(user.id)}
            >
              Tümünü okundu işaretle
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {myNotifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Henüz bildirimin yok.
            </p>
          ) : (
            <div className="divide-y divide-border border-t border-border">
              {myNotifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "#"}
                  onClick={() => {
                    markNotificationRead(n.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-muted",
                    !n.readAt && "bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      !n.readAt ? "bg-primary" : "bg-transparent",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 font-medium">
                      {n.title}
                      {n.channel === "in_app_and_email" && (
                        <Mail
                          className="size-3 shrink-0 text-muted-foreground"
                          aria-label="E-posta olarak da gönderildi"
                        />
                      )}
                    </p>
                    {n.body && <p className="truncate text-muted-foreground">{n.body}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
