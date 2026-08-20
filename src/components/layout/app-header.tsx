"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppStore, useCurrentUser } from "@/store/useAppStore";
import type { UserRole } from "@/types";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Yönetici",
  judge: "Hakem",
  contestant: "Yarışmacı",
};

export function AppHeader() {
  const user = useCurrentUser();
  const logout = useAppStore((s) => s.logout);
  const router = useRouter();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-[-0.02em]">Ludex</span>
          <span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]} Paneli</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 transition-transform active:scale-[0.97]"
            onClick={() => {
              logout();
              router.replace("/");
            }}
          >
            <LogOut className="size-4" />
            Çıkış
          </Button>
        </div>
      </div>
    </header>
  );
}
