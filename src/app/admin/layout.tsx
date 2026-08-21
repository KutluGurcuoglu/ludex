"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertOctagon,
  Gavel,
  LayoutGrid,
  LifeBuoy,
  List,
  Menu,
  UserCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RouteGuard } from "@/components/auth/route-guard";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAppStore } from "@/store/useAppStore";
import * as usersService from "@/services/users.service";
import * as supportService from "@/services/support.service";
import {
  refreshReports,
  refreshCategories,
  refreshEvaluations,
  refreshScoreCriteria,
} from "@/services/sync";
import {
  AdminSkeleton,
  APPROVAL_STATUS_BADGE_CLASS,
  NAV_ITEMS,
  VIEW_TOGGLE_HIDDEN_PATHS,
  ViewModeProvider,
  useViewMode,
} from "./_lib/shared";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allow={["admin"]}>
      <ViewModeProvider>
        <AdminShell>{children}</AdminShell>
      </ViewModeProvider>
    </RouteGuard>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const users = useAppStore((s) => s.users);
  const evaluations = useAppStore((s) => s.evaluations);
  const reports = useAppStore((s) => s.reports);
  const supportMessages = useAppStore((s) => s.supportMessages);

  const [isLoading, setIsLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const { viewMode, setViewMode } = useViewMode();

  useEffect(() => {
    let active = true;
    Promise.all([
      refreshReports(),
      refreshCategories(),
      usersService.getUsers(),
      refreshEvaluations(),
      refreshScoreCriteria(),
      supportService.getSupportMessages(),
    ])
      .catch((error) => {
        console.error("Admin verileri yüklenemedi:", error);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const judges = useMemo(() => users.filter((u) => u.role === "judge"), [users]);
  const contestants = useMemo(() => users.filter((u) => u.role === "contestant"), [users]);
  const pendingJudgeApplications = useMemo(
    () =>
      judges.filter(
        (j) => (j.judgeApprovalStatus ?? "pending") === "pending" && j.categoryIds.length > 0,
      ),
    [judges],
  );
  const pendingDisqualifications = useMemo(
    () =>
      evaluations.filter(
        (e) =>
          e.disqualificationRecommendation &&
          !e.disqualificationRecommendation.adminDecision &&
          reports.some((r) => r.id === e.reportId),
      ),
    [evaluations, reports],
  );
  const pendingSupportMessages = useMemo(
    () => supportMessages.filter((m) => !m.resolvedAt),
    [supportMessages],
  );

  const currentLabel =
    NAV_ITEMS.find((item) => item.href === pathname)?.label ?? "Yönetim Paneli";
  const showViewToggle = !VIEW_TOGGLE_HIDDEN_PATHS.has(pathname);

  if (isLoading) {
    return (
      <>
        <AppHeader subtitle={NAV_ITEMS[0].label} />
        <div className="min-h-[calc(100vh-4rem)]">
          <main className="w-full px-6 py-8 md:px-12">
            <AdminSkeleton />
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader subtitle={currentLabel} />
      <div className="min-h-[calc(100vh-4rem)]">
        <div className="glass-toolbar sticky top-16 z-30 flex items-center justify-between px-6 py-3 md:px-12">
          <Button variant="outline" size="icon" onClick={() => setNavOpen(true)}>
            <Menu className="size-4" />
          </Button>
          <div className="flex items-center gap-2">
            {pendingJudgeApplications.length > 0 && (
              <Badge
                variant="outline"
                className={cn("cursor-pointer gap-1.5", APPROVAL_STATUS_BADGE_CLASS.pending)}
                onClick={() => router.push("/admin/judge-applications")}
              >
                <UserCheck className="size-3" />
                {pendingJudgeApplications.length} Bekleyen Başvuru
              </Badge>
            )}
            {pendingDisqualifications.length > 0 && (
              <Badge
                variant="outline"
                className="cursor-pointer gap-1.5 border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                onClick={() => router.push("/admin/disqualifications")}
              >
                <AlertOctagon className="size-3" />
                {pendingDisqualifications.length} Elenme Önerisi
              </Badge>
            )}
            {pendingSupportMessages.length > 0 && (
              <Badge
                variant="outline"
                className="cursor-pointer gap-1.5 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                onClick={() => router.push("/admin/support")}
              >
                <LifeBuoy className="size-3" />
                {pendingSupportMessages.length} Destek Talebi
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1.5">
              <Gavel className="size-3" />
              {judges.length} Hakem
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Users className="size-3" />
              {contestants.length} Yarışmacı
            </Badge>
            {showViewToggle && (
              <div className="ml-1 flex items-center gap-1 rounded-lg border border-border p-0.5">
                <Button
                  type="button"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon-sm"
                  aria-label="Kutu görünümü"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon-sm"
                  aria-label="Liste görünümü"
                  onClick={() => setViewMode("list")}
                >
                  <List className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <main className="w-full px-6 py-8 md:px-12">{children}</main>
      </div>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-64">
          <SheetHeader>
            <SheetTitle>Yönetim Menüsü</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setNavOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-base font-medium transition-colors",
                    active ? "bg-primary/10 text-primary" : "hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
