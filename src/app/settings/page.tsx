"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Gavel, Laptop, Loader2, Moon, ShieldAlert, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { RouteGuard } from "@/components/auth/route-guard";
import { AppHeader } from "@/components/layout/app-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAppStore, useCurrentUser } from "@/store/useAppStore";
import * as usersService from "@/services/users.service";
import type { JudgeApprovalStatus, JudgeWorkStatus, UserRole } from "@/types";

const DASHBOARD_PATH: Record<UserRole, string> = {
  admin: "/admin",
  judge: "/judge",
  contestant: "/contestant",
};

const WORK_STATUS_LABEL: Record<JudgeWorkStatus, string> = {
  working: "Çalışıyor",
  studying: "Öğrenci",
  both: "Çalışıyor + Öğrenci",
};

const APPROVAL_STATUS_META: Record<
  JudgeApprovalStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Onay Bekliyor",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  approved: {
    label: "Onaylandı",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  },
  rejected: {
    label: "Reddedildi",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  },
};

const THEME_OPTIONS = [
  { value: "light", label: "Açık", icon: Sun },
  { value: "dark", label: "Koyu", icon: Moon },
  { value: "system", label: "Sistem", icon: Laptop },
] as const;

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Görünüm</CardTitle>
        <CardDescription>Ludex&apos;in açık, koyu veya sistem temasını seç.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = (theme ?? "system") === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-medium transition-colors",
                  active ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted",
                )}
              >
                <Icon className="size-4" />
                {option.label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsSection({
  userId,
  notifyReportAssigned,
  notifyEvaluationUpdates,
  notifyProductUpdates,
}: {
  userId: string;
  notifyReportAssigned: boolean;
  notifyEvaluationUpdates: boolean;
  notifyProductUpdates: boolean;
}) {
  async function toggle(field: "notifyReportAssigned" | "notifyEvaluationUpdates" | "notifyProductUpdates", value: boolean) {
    await usersService.updateProfile(userId, { [field]: value });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bildirimler</CardTitle>
        <CardDescription>Hangi durumlarda e-posta bildirimi almak istediğini seç.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-base font-medium">Rapor ataması</p>
            <p className="text-sm text-muted-foreground">
              Sana yeni bir rapor atandığında bildirim al.
            </p>
          </div>
          <Switch
            checked={notifyReportAssigned}
            onCheckedChange={(v) => toggle("notifyReportAssigned", v)}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-base font-medium">Değerlendirme güncellemeleri</p>
            <p className="text-sm text-muted-foreground">
              Bir raporun durumu değiştiğinde bildirim al.
            </p>
          </div>
          <Switch
            checked={notifyEvaluationUpdates}
            onCheckedChange={(v) => toggle("notifyEvaluationUpdates", v)}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-base font-medium">Ürün güncellemeleri</p>
            <p className="text-sm text-muted-foreground">
              Ludex&apos;teki yeni özellikler hakkında ara sıra e-posta al.
            </p>
          </div>
          <Switch
            checked={notifyProductUpdates}
            onCheckedChange={(v) => toggle("notifyProductUpdates", v)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SecuritySection({ userId }: { userId: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Yeni şifre en az 6 karakter olmalı.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Yeni şifreler eşleşmiyor.");
      return;
    }

    setSaving(true);
    const result = await usersService.changePassword(userId, currentPassword, newPassword);
    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Şifre değiştirilemedi.");
      return;
    }

    toast.success("Şifren güncellendi.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hesap Güvenliği</CardTitle>
        <CardDescription>Şifreni değiştir.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Mevcut Şifre</Label>
            <Input
              id="current-password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">Yeni Şifre</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Yeni Şifre (Tekrar)</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <ShieldAlert className="size-4" />
              {error}
            </p>
          )}

          <Button type="submit" disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Şifreyi Güncelle
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function JudgeStatusSection({
  approvalStatus,
  workStatus,
  categoryIds,
}: {
  approvalStatus: JudgeApprovalStatus;
  workStatus: JudgeWorkStatus | undefined;
  categoryIds: string[];
}) {
  const categories = useAppStore((s) => s.categories);
  const expertise = categories.filter((c) => categoryIds.includes(c.id));
  const meta = APPROVAL_STATUS_META[approvalStatus];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel className="size-4" />
          Hakem Başvurun
        </CardTitle>
        <CardDescription>Admin onayı ve uzmanlık alanların hakkındaki özet.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-base text-muted-foreground">Onay Durumu</span>
          <Badge variant="outline" className={meta.className}>
            {meta.label}
          </Badge>
        </div>
        <Separator />
        <div className="space-y-1.5">
          <span className="text-base text-muted-foreground">Çalışma Durumu</span>
          <p className="font-medium">{workStatus ? WORK_STATUS_LABEL[workStatus] : "Belirtilmemiş"}</p>
        </div>
        <Separator />
        <div className="space-y-1.5">
          <span className="text-base text-muted-foreground">Uzmanlık Alanları</span>
          <div className="flex flex-wrap gap-1.5">
            {expertise.length > 0 ? (
              expertise.map((c) => (
                <Badge key={c.id} variant="secondary">
                  {c.name}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Henüz seçilmedi</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <RouteGuard allow={["admin", "judge", "contestant"]}>
      <SettingsView />
    </RouteGuard>
  );
}

function SettingsView() {
  const user = useCurrentUser();
  const router = useRouter();

  if (!user) return null;

  return (
    <>
      <AppHeader subtitle="Ayarlar" />
      <div className="min-h-[calc(100vh-4rem)]">
        <main className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10 md:px-12">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Ayarlar</h1>
              <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                Görünüm, bildirim ve hesap güvenliği tercihlerini buradan yönet.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(DASHBOARD_PATH[user.role])}
            >
              ← Panele Dön
            </Button>
          </div>

          <AppearanceSection />
          <NotificationsSection
            userId={user.id}
            notifyReportAssigned={user.notifyReportAssigned ?? true}
            notifyEvaluationUpdates={user.notifyEvaluationUpdates ?? true}
            notifyProductUpdates={user.notifyProductUpdates ?? false}
          />
          <SecuritySection userId={user.id} />
          {user.role === "judge" && (
            <JudgeStatusSection
              approvalStatus={user.judgeApprovalStatus ?? "pending"}
              workStatus={user.judgeWorkStatus}
              categoryIds={user.categoryIds}
            />
          )}
        </main>
      </div>
    </>
  );
}
