"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  FileClock,
  FolderKanban,
  Gavel,
  LayoutGrid,
  List,
  Loader2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RouteGuard } from "@/components/auth/route-guard";
import { AppHeader } from "@/components/layout/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore, useCurrentUser } from "@/store/useAppStore";
import * as reportsService from "@/services/reports.service";
import * as categoriesService from "@/services/categories.service";
import * as usersService from "@/services/users.service";
import type { Category, JudgeWorkStatus, Report, ReportStatus, User } from "@/types";

const WORK_STATUS_LABEL: Record<JudgeWorkStatus, string> = {
  working: "Çalışıyorum",
  studying: "Öğrenciyim",
  both: "Her ikisi de",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

type Accent = "amber" | "violet" | "emerald" | "primary";

const ACCENT_CLASS: Record<Accent, string> = {
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  primary: "bg-primary/10 text-primary",
};

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  accent: Accent;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${ACCENT_CLASS[accent]}`}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportList({
  reports,
  onOpen,
  startingId,
  actionLabel,
  emptyText,
}: {
  reports: Report[];
  onOpen: (reportId: string, status: ReportStatus) => void;
  startingId: string | null;
  actionLabel: string;
  emptyText: string;
}) {
  if (reports.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-base text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => {
        const isStarting = startingId === report.id;
        return (
          <Card key={report.id} className="py-0">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{report.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {report.contestantName} &middot; {formatDate(report.submittedAt)}
                </p>
              </div>
              <Button
                size="sm"
                disabled={isStarting}
                onClick={() => onOpen(report.id, report.status)}
                className="gap-1.5 transition-transform active:scale-[0.97]"
              >
                {isStarting && <Loader2 className="size-4 animate-spin" />}
                {actionLabel}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function countByCategory(reports: Report[], categoryId: string) {
  const inCategory = reports.filter((r) => r.categoryId === categoryId);
  return {
    total: inCategory.length,
    pending: inCategory.filter((r) => r.status === "assigned").length,
    inReview: inCategory.filter((r) => r.status === "in_review").length,
    completed: inCategory.filter((r) => r.status === "completed").length,
  };
}

function JudgeApplicationForm({ user, categories }: { user: User; categories: Category[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(user.categoryIds);
  const [workStatus, setWorkStatus] = useState<JudgeWorkStatus>(user.judgeWorkStatus ?? "working");
  const [submitting, setSubmitting] = useState(false);

  function toggleCategory(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0) {
      toast.error("En az bir uzmanlık alanı seçmelisin.");
      return;
    }

    setSubmitting(true);
    await usersService.submitJudgeApplication(user.id, { categoryIds: selectedIds, workStatus });
    setSubmitting(false);
    toast.success("Başvurun gönderildi, admin onayını bekliyor.");
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Gavel className="size-6" />
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Hakem Başvurunu Tamamla</h1>
        <p className="mt-1 text-base leading-relaxed text-muted-foreground">
          Rapor ataması alabilmen için önce uzmanlık alanlarını seç ve durumunu belirt. Admin
          onayladıktan sonra panele erişebilirsin.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label>Uzmanlık Alanların</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {categories.map((c) => (
                  <Label
                    key={c.id}
                    htmlFor={`cat-${c.id}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-normal transition-colors",
                      selectedIds.includes(c.id) ? "border-primary bg-primary/5" : "border-border",
                    )}
                  >
                    <Checkbox
                      id={`cat-${c.id}`}
                      checked={selectedIds.includes(c.id)}
                      onCheckedChange={() => toggleCategory(c.id)}
                    />
                    {c.name}
                  </Label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Durumun</Label>
              <RadioGroup
                value={workStatus}
                onValueChange={(v) => setWorkStatus(v as JudgeWorkStatus)}
                className="grid grid-cols-3 gap-2"
              >
                {(Object.keys(WORK_STATUS_LABEL) as JudgeWorkStatus[]).map((key) => (
                  <Label
                    key={key}
                    htmlFor={`work-${key}`}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-3 text-center text-sm font-normal transition-colors",
                      workStatus === key ? "border-primary bg-primary/5" : "border-border",
                    )}
                  >
                    <RadioGroupItem value={key} id={`work-${key}`} />
                    {WORK_STATUS_LABEL[key]}
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <Button type="submit" disabled={submitting} className="w-full gap-1.5">
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Başvuruyu Gönder
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function JudgeStatusNotice({
  icon: Icon,
  iconClassName,
  title,
  description,
}: {
  icon: typeof Clock;
  iconClassName: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-md text-center">
      <div className={cn("mx-auto flex size-12 items-center justify-center rounded-2xl", iconClassName)}>
        <Icon className="size-6" />
      </div>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-base leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

export default function JudgePage() {
  return (
    <RouteGuard allow={["judge"]}>
      <JudgeDashboard />
    </RouteGuard>
  );
}

function JudgeDashboard() {
  const router = useRouter();
  const user = useCurrentUser();
  const categories = useAppStore((s) => s.categories);
  const reports = useAppStore((s) => s.reports);

  const [isLoading, setIsLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    let active = true;
    Promise.all([reportsService.getReports(), categoriesService.getCategories()]).then(() => {
      if (active) setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const myReports = useMemo(
    () => (user ? reports.filter((r) => r.assignedJudgeId === user.id) : []),
    [reports, user],
  );

  const myCategories = useMemo(() => {
    const categoryIds = new Set(myReports.map((r) => r.categoryId));
    return categories.filter((c) => categoryIds.has(c.id));
  }, [categories, myReports]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;
  const categoryReports = selectedCategory
    ? myReports.filter((r) => r.categoryId === selectedCategory.id)
    : [];

  const pending = categoryReports.filter((r) => r.status === "assigned");
  const inReview = categoryReports.filter((r) => r.status === "in_review");
  const completed = categoryReports.filter((r) => r.status === "completed");

  async function handleOpen(reportId: string, currentStatus: ReportStatus) {
    setStartingId(reportId);
    if (currentStatus === "assigned") {
      await reportsService.setReportStatus(reportId, "in_review");
    }
    router.push(`/judge/evaluation/${reportId}`);
  }

  if (isLoading) {
    return (
      <>
        <AppHeader subtitle="Hakem Paneli" />
        <div className="min-h-[calc(100vh-4rem)]">
          <main className="w-full px-6 py-10 md:px-12">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="mt-2 h-4 w-80 max-w-full" />
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </main>
        </div>
      </>
    );
  }

  const approvalStatus = user?.judgeApprovalStatus ?? "pending";

  if (user && approvalStatus !== "approved") {
    return (
      <>
        <AppHeader subtitle="Hakem Paneli" />
        <div className="flex min-h-[calc(100vh-4rem)] items-center">
          <main className="w-full px-6 py-10 md:px-12">
            {approvalStatus === "rejected" ? (
              <JudgeStatusNotice
                icon={XCircle}
                iconClassName="bg-red-500/10 text-red-600 dark:text-red-400"
                title="Başvurun Onaylanmadı"
                description="Hakem başvurun admin tarafından onaylanmadı. Sorularun için yönetimle iletişime geçebilirsin."
              />
            ) : user.categoryIds.length === 0 ? (
              <JudgeApplicationForm user={user} categories={categories} />
            ) : (
              <JudgeStatusNotice
                icon={Clock}
                iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                title="Başvurun İnceleniyor"
                description="Hakem başvurun admin tarafından değerlendiriliyor. Onaylandığında bu sayfadan raporlara erişebileceksin."
              />
            )}
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader subtitle="Hakem Paneli" />
      <div className="min-h-[calc(100vh-4rem)]">
        <main className="w-full px-6 py-10 md:px-12">
          {!selectedCategory ? (
            <>
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-medium text-primary">Hoş geldin</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                    {user?.name ?? "Hakem"}
                  </h1>
                  <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                    Sana atanmış kategorileri ve raporları buradan yönetebilirsin.
                  </p>
                </div>
                {myCategories.length > 0 && (
                  <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border p-0.5">
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

              {myCategories.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-base text-muted-foreground">
                  Henüz sana atanmış bir rapor yok.
                </p>
              ) : (
                <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
                  {myCategories.map((category) => {
                    const counts = countByCategory(myReports, category.id);
                    const statTiles = (
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="rounded-lg bg-emerald-500/10 py-2 text-emerald-700 dark:text-emerald-400">
                          <p className="text-base font-bold">{counts.completed}</p>
                          tamamlanan
                        </div>
                        <div className="rounded-lg bg-violet-500/10 py-2 text-violet-700 dark:text-violet-400">
                          <p className="text-base font-bold">{counts.inReview}</p>
                          devam eden
                        </div>
                        <div className="rounded-lg bg-amber-500/10 py-2 text-amber-700 dark:text-amber-400">
                          <p className="text-base font-bold">{counts.pending}</p>
                          bekleyen
                        </div>
                      </div>
                    );

                    if (viewMode === "list") {
                      return (
                        <Card
                          key={category.id}
                          className="cursor-pointer py-0 transition-colors hover:border-primary/40"
                          onClick={() => setSelectedCategoryId(category.id)}
                        >
                          <CardContent className="flex flex-wrap items-center gap-4 px-5 py-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <FolderKanban className="size-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-semibold">{category.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {counts.total} atanmış rapor
                              </p>
                            </div>
                            <div className="w-full max-w-xs shrink-0 sm:w-auto">{statTiles}</div>
                          </CardContent>
                        </Card>
                      );
                    }

                    return (
                      <Card
                        key={category.id}
                        className="cursor-pointer transition-colors hover:border-primary/40"
                        onClick={() => setSelectedCategoryId(category.id)}
                      >
                        <CardContent className="space-y-4 pt-6">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <FolderKanban className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold">{category.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {counts.total} atanmış rapor
                              </p>
                            </div>
                          </div>
                          {statTiles}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-8">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-2 -ml-2"
                  onClick={() => setSelectedCategoryId(null)}
                >
                  ← Kategorilere Dön
                </Button>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {selectedCategory.name}
                </h1>
                <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                  Bu kategoride sana atanmış raporlar.
                </p>
              </div>

              <div className="mb-8 grid gap-4 sm:grid-cols-3">
                <StatCard icon={FileClock} label="Bekleyen" value={pending.length} accent="amber" />
                <StatCard icon={Clock} label="Devam Eden" value={inReview.length} accent="violet" />
                <StatCard
                  icon={CheckCircle2}
                  label="Tamamlanan"
                  value={completed.length}
                  accent="emerald"
                />
              </div>

              <Tabs defaultValue="pending">
                <TabsList>
                  <TabsTrigger value="pending">Bekleyen ({pending.length})</TabsTrigger>
                  <TabsTrigger value="in_review">Devam Eden ({inReview.length})</TabsTrigger>
                  <TabsTrigger value="completed">Tamamlanan ({completed.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-6">
                  <ReportList
                    reports={pending}
                    onOpen={handleOpen}
                    startingId={startingId}
                    actionLabel="Değerlendirmeye Başla"
                    emptyText="Bekleyen raporun yok."
                  />
                </TabsContent>
                <TabsContent value="in_review" className="mt-6">
                  <ReportList
                    reports={inReview}
                    onOpen={handleOpen}
                    startingId={startingId}
                    actionLabel="Devam Et"
                    emptyText="Devam eden bir değerlendirmen yok."
                  />
                </TabsContent>
                <TabsContent value="completed" className="mt-6">
                  <ReportList
                    reports={completed}
                    onOpen={handleOpen}
                    startingId={startingId}
                    actionLabel="Sonuçları Görüntüle"
                    emptyText="Henüz tamamlanmış bir değerlendirmen yok."
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </main>
      </div>
    </>
  );
}
