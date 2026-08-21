"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppStore, useCurrentUser } from "@/store/useAppStore";
import type { UserRole } from "@/types";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Yönetici",
  judge: "Hakem",
  contestant: "Yarışmacı",
};

export function AppHeader({ subtitle }: { subtitle?: string } = {}) {
  const user = useCurrentUser();
  const logout = useAppStore((s) => s.logout);
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!user) return null;

  return (
    <header className="glass-toolbar sticky top-0 z-40">
      <div className="flex h-16 w-full items-center justify-between px-6 md:px-12">
        <div className="flex flex-col items-start justify-center leading-tight">
          <span className="text-brand-gradient text-lg font-bold tracking-tight">
            Ludex
          </span>
          <span className="text-sm text-muted-foreground">
            {subtitle ?? `${ROLE_LABELS[user.role]} Paneli`}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <Button asChild variant="ghost" size="icon" className="size-8" aria-label="Ayarlar">
            <Link href="/settings">
              <Settings className="size-4" />
            </Link>
          </Button>
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-full transition-opacity hover:opacity-75"
          >
            <Avatar className="size-8">
              <AvatarFallback className="text-sm">
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-base font-medium sm:inline">{user.name}</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 transition-transform active:scale-[0.97]"
            onClick={() => setConfirmOpen(true)}
          >
            <LogOut className="size-4" />
            Çıkış
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Çıkış yapmak istediğine emin misin?</AlertDialogTitle>
            <AlertDialogDescription>
              Oturumun sonlandırılacak ve giriş ekranına yönlendirileceksin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                logout();
                router.replace("/login");
              }}
            >
              Çıkış Yap
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
