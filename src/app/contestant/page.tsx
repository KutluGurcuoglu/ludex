"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  Menu,
  Send,
  UploadCloud,
  User as UserIcon,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RouteGuard } from "@/components/auth/route-guard";
import { AppHeader } from "@/components/layout/app-header";
import { ReportTimeline } from "@/components/report-timeline";
import { aggregateEvaluations } from "@/lib/scoring";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAppStore, useCurrentUser } from "@/store/useAppStore";
import * as reportsService from "@/services/reports.service";
import * as categoriesService from "@/services/categories.service";
import * as evaluationsService from "@/services/evaluations.service";
import * as aiAnalysisService from "@/services/ai-analysis.service";
import type { AIAnalysisResult, ReportStatus } from "@/types";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending_assignment: "Gönderildi",
  assigned: "Gönderildi",
  in_review: "Değerlendirmede",
  completed: "Tamamlandı",
  disqualified: "Elendi",
};

const STATUS_BADGE_CLASS: Record<ReportStatus, string> = {
  pending_assignment:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  assigned:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  in_review:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  disqualified:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

const STATUS_ICON: Record<ReportStatus, typeof Clock> = {
  pending_assignment: Send,
  assigned: Send,
  in_review: Clock,
  completed: CheckCircle2,
  disqualified: XCircle,
};

type Section = "overview" | "submit" | "reports";

const SECTION_META: Record<Section, { label: string; icon: typeof LayoutDashboard }> = {
  overview: { label: "Genel Bakış", icon: LayoutDashboard },
  submit: { label: "Rapor Gönder", icon: UploadCloud },
  reports: { label: "Raporlarım", icon: FileText },
};

type Accent = "primary" | "blue" | "amber" | "emerald";

const ACCENT_CLASS: Record<Accent, string> = {
  primary: "bg-primary/10 text-primary",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

function StatCard({
  icon: Icon,
  label,
  value,
  accent = "primary",
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  accent?: Accent;
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

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function ContestantSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-2 h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-96 max-w-full" />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-9 w-32" />
            </CardContent>
          </Card>
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-3 pt-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ContestantPage() {
  return (
    <RouteGuard allow={["contestant"]}>
      <ContestantDashboard />
    </RouteGuard>
  );
}

function ContestantDashboard() {
  const user = useCurrentUser();
  const categories = useAppStore((s) => s.categories);
  const reports = useAppStore((s) => s.reports);
  const evaluations = useAppStore((s) => s.evaluations);
  const scoreCriteria = useAppStore((s) => s.scoreCriteria);

  const [isLoading, setIsLoading] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [detailReportId, setDetailReportId] = useState<string | null>(null);
  const [detailAnalysis, setDetailAnalysis] = useState<AIAnalysisResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [navOpen, setNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("overview");

  const loadingAnalysis = !!detailReportId && detailAnalysis?.reportId !== detailReportId;

  useEffect(() => {
    if (!detailReportId) return;
    let active = true;
    aiAnalysisService.getAIAnalysis(detailReportId).then((result) => {
      if (active) setDetailAnalysis(result);
    });
    return () => {
      active = false;
    };
  }, [detailReportId]);

  useEffect(() => {
    let active = true;
    Promise.all([
      reportsService.getReports(),
      categoriesService.getCategories(),
      evaluationsService.getEvaluations(),
      evaluationsService.getScoreCriteria(),
    ]).then(() => {
      if (active) setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const maxTotalScore = useMemo(
    () => scoreCriteria.reduce((sum, c) => sum + c.maxScore, 0),
    [scoreCriteria],
  );

  const detailReport = reports.find((r) => r.id === detailReportId) ?? null;
  const detailReportEvaluations = useMemo(
    () => evaluations.filter((e) => e.reportId === detailReportId),
    [evaluations, detailReportId],
  );
  // Hakem bitirir bitirmez puan görünmez — admin tek tek onaylayana ya da kategori
  // toplu yayınlanana kadar (visibleToContestant) yarışmacıya sadece "sonuç bekleniyor" gösterilir.
  const detailAggregate = useMemo(
    () =>
      aggregateEvaluations(
        detailReportEvaluations.filter((e) => e.visibleToContestant),
        scoreCriteria,
      ),
    [detailReportEvaluations, scoreCriteria],
  );
  const detailDisqualification = detailReportEvaluations
    .map((e) => e.disqualificationRecommendation)
    .find((d) => d?.adminDecision === "upheld");
  // Zaman çizelgesindeki "sonuç" adımı için en güncel değerlendirmeyi kullan.
  const detailLatestEvaluation = [...detailReportEvaluations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0];

  const myReports = useMemo(
    () =>
      user
        ? reports
            .filter((r) => r.contestantId === user.id)
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        : [],
    [reports, user],
  );

  const statusCounts = useMemo(
    () => ({
      submitted: myReports.filter(
        (r) => r.status === "pending_assignment" || r.status === "assigned",
      ).length,
      inReview: myReports.filter((r) => r.status === "in_review").length,
      completed: myReports.filter((r) => r.status === "completed").length,
    }),
    [myReports],
  );

  function validateAndSetFile(candidate: File) {
    setFileError(null);

    const isPdf =
      candidate.type === "application/pdf" || candidate.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setFileError("Sadece PDF formatında dosya yükleyebilirsin.");
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setFileError("Dosya boyutu 20 MB'ı geçemez.");
      return;
    }

    setFile(candidate);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validateAndSetFile(dropped);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !categoryId || !title.trim() || !file) return;

    setSubmitting(true);
    await reportsService.submitReport({
      contestantId: user.id,
      categoryId,
      title: title.trim(),
      fileName: file.name,
      fileSizeBytes: file.size,
      // Gerçek dosya içeriğini gösterir; bu blob URL sadece bu tarayıcı sekmesinde ve
      // sayfa yenilenene kadar geçerlidir (backend'e taşınınca gerçek bir dosya URL'i olacak).
      pdfUrl: URL.createObjectURL(file),
    });
    setSubmitting(false);

    toast.success("Raporun başarıyla gönderildi.", {
      description: "Admin tarafından bir hakeme atandığında durumunu buradan takip edebilirsin.",
    });

    setCategoryId("");
    setTitle("");
    setFile(null);
    setFileError(null);
  }

  const canSubmit = Boolean(categoryId && title.trim() && file);

  if (isLoading) {
    return (
      <>
        <AppHeader />
        <div className="min-h-[calc(100vh-4rem)]">
          <main className="w-full px-6 py-12 md:px-12">
            <ContestantSkeleton />
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader subtitle={SECTION_META[activeSection].label} />
      <div className="min-h-[calc(100vh-4rem)]">
        <div className="glass-toolbar sticky top-16 z-30 flex items-center justify-between px-6 py-3 md:px-12">
          <Button variant="outline" size="icon" onClick={() => setNavOpen(true)}>
            <Menu className="size-4" />
          </Button>
          <Badge variant="secondary" className="gap-1.5">
            <FileText className="size-3" />
            {myReports.length} Rapor
          </Badge>
        </div>

      <main className="w-full px-6 py-8 md:px-12">
        {activeSection === "overview" && (
          <div>
            <div className="mb-8">
              <p className="text-base font-medium text-primary">Hoş geldin</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                {user?.name ?? "Yarışmacı"}
              </h1>
              <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                Kategori seçip raporunu PDF olarak yükle, değerlendirme sürecini buradan takip et.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={FileText} label="Toplam Rapor" value={myReports.length} />
              <StatCard icon={Send} label="Gönderildi" value={statusCounts.submitted} accent="blue" />
              <StatCard icon={Clock} label="Değerlendirmede" value={statusCounts.inReview} accent="amber" />
              <StatCard
                icon={CheckCircle2}
                label="Tamamlandı"
                value={statusCounts.completed}
                accent="emerald"
              />
            </div>

            <div className="mt-6 max-w-sm">
              <Card>
                <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
                  <Avatar className="size-12">
                    <AvatarFallback>{user?.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-base font-semibold">{user?.name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full gap-1.5">
                    <Link href="/profile">
                      <UserIcon className="size-4" />
                      Profili Düzenle
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeSection === "submit" && (
          <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Yeni Rapor Gönder</CardTitle>
            <CardDescription>Kategori, başlık ve PDF dosyasını doldurup gönder.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="report-category">Kategori</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger id="report-category" className="w-full">
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-title">Rapor Başlığı</Label>
                  <Input
                    id="report-title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Örn: Otonom Yol Planlama Sistemi"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rapor Dosyası (PDF)</Label>

                {!file ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200 active:scale-[0.98] ${
                      isDragging
                        ? "scale-[1.01] border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <UploadCloud className="size-8 text-muted-foreground" />
                    <p className="text-base font-medium">
                      Dosyayı sürükle bırak veya <span className="text-primary">gözat</span>
                    </p>
                    <p className="text-sm text-muted-foreground">PDF, maksimum 20 MB</p>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const selected = e.target.files?.[0];
                        if (selected) validateAndSetFile(selected);
                        e.target.value = "";
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="size-5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() => setFile(null)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                )}

                {fileError && <p className="text-sm font-medium text-destructive">{fileError}</p>}
              </div>

              <Button
                type="submit"
                disabled={!canSubmit || submitting}
                className="w-full gap-2 transition-transform active:scale-[0.98] sm:w-auto"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {submitting ? "Gönderiliyor..." : "Raporu Gönder"}
              </Button>
            </form>
          </CardContent>
        </Card>
          </div>
        )}

        {activeSection === "reports" && (
        <div className="space-y-3">
          {myReports.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-base text-muted-foreground">
              Henüz gönderilmiş bir raporun yok.
            </p>
          ) : (
            <div className="space-y-2">
              {myReports.map((report) => {
                const Icon = STATUS_ICON[report.status];
                const category = categories.find((c) => c.id === report.categoryId);
                const reportEvaluation = evaluations.find((e) => e.reportId === report.id) ?? null;
                const isDisqualified = report.status === "disqualified";
                const isPublished = evaluations.some(
                  (e) => e.reportId === report.id && e.visibleToContestant,
                );
                const isWaitingForRelease = report.status === "completed" && !isPublished;
                return (
                  <Card key={report.id}>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold">{report.title}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {category?.name ?? "Kategori"} &middot; {formatFileSize(report.fileSizeBytes)}{" "}
                            &middot; {formatDate(report.submittedAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`gap-1 ${STATUS_BADGE_CLASS[report.status]}`}
                          >
                            <Icon className="size-3" />
                            {isWaitingForRelease ? "Değerlendirildi" : STATUS_LABEL[report.status]}
                          </Badge>
                          {(isPublished || isDisqualified) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="transition-transform active:scale-[0.97]"
                              onClick={() => setDetailReportId(report.id)}
                            >
                              Ayrıntıları Göster
                            </Button>
                          )}
                        </div>
                      </div>
                      {isWaitingForRelease && (
                        <p className="text-sm text-muted-foreground">
                          Hakem değerlendirmeyi tamamladı, sonuç yönetici onayı/yayını
                          bekleniyor.
                        </p>
                      )}
                      <ReportTimeline report={report} evaluation={reportEvaluation} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        )}
      </main>
      </div>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-64">
          <SheetHeader>
            <SheetTitle>Yarışmacı Menüsü</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-3">
            {(Object.keys(SECTION_META) as Section[]).map((key) => {
              const Icon = SECTION_META[key].icon;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveSection(key);
                    setNavOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-base font-medium transition-colors",
                    activeSection === key ? "bg-primary/10 text-primary" : "hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" />
                  {SECTION_META[key].label}
                </button>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      <Dialog open={!!detailReportId} onOpenChange={(open) => !open && setDetailReportId(null)}>
        <DialogContent className="sm:max-w-md">
          {detailReport && (
            <>
              <DialogHeader>
                <DialogTitle>{detailReport.title}</DialogTitle>
                <DialogDescription>Hakem değerlendirme sonucun</DialogDescription>
              </DialogHeader>

              {detailReport && (
                <ReportTimeline
                  report={detailReport}
                  evaluation={detailLatestEvaluation}
                  className="pb-1"
                />
              )}

              {detailAggregate ? (
                <div className="space-y-5">
                  {detailDisqualification && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                      <XCircle className="mt-0.5 size-4 shrink-0" />
                      <div>
                        <p className="font-medium">Bu rapor elenmiştir</p>
                        <p className="mt-0.5 text-sm">{detailDisqualification.findingText}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                    <div>
                      <span className="text-base font-medium text-muted-foreground">
                        {detailAggregate.judgeCount > 1 ? "Ortalama Puan" : "Toplam Puan"}
                      </span>
                      {detailAggregate.judgeCount > 1 && (
                        <p className="text-sm text-muted-foreground">
                          {detailAggregate.judgeCount} hakemin ortalaması
                        </p>
                      )}
                    </div>
                    <span className="text-2xl font-bold text-primary">
                      {Math.round(detailAggregate.averageTotal * 10) / 10}
                      <span className="text-base font-medium text-muted-foreground">
                        {" "}
                        / {maxTotalScore}
                      </span>
                    </span>
                  </div>

                  <div className="space-y-4">
                    {scoreCriteria.map((criterion) => {
                      const average =
                        detailAggregate.criteriaAverages.find(
                          (c) => c.criterionId === criterion.id,
                        )?.average ?? 0;
                      const singleComment =
                        detailAggregate.judgeCount === 1
                          ? detailAggregate.evaluations[0]?.criteriaScores.find(
                              (cs) => cs.criterionId === criterion.id,
                            )?.comment
                          : undefined;
                      return (
                        <div key={criterion.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-base">
                            <span className="font-medium">{criterion.label}</span>
                            <span className="text-muted-foreground">
                              {Math.round(average * 10) / 10} / {criterion.maxScore}
                            </span>
                          </div>
                          <Progress value={(average / criterion.maxScore) * 100} />
                          {singleComment && (
                            <p className="text-sm text-muted-foreground">{singleComment}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {detailAggregate.evaluations.some((e) => e.overallComment) && (
                    <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                      <p className="text-base font-medium">
                        {detailAggregate.judgeCount > 1 ? "Hakem Yorumları" : "Hakem Yorumu"}
                      </p>
                      {detailAggregate.evaluations.map((e, i) =>
                        e.overallComment ? (
                          <p key={e.id} className="text-base text-muted-foreground">
                            {detailAggregate.judgeCount > 1 && (
                              <span className="font-medium">Hakem {i + 1}: </span>
                            )}
                            {e.overallComment}
                          </p>
                        ) : null,
                      )}
                    </div>
                  )}

                  {loadingAnalysis ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : (
                    detailAnalysis && (
                      <div className="space-y-4 border-t border-border pt-4">
                        <p className="text-base font-medium">AI Değerlendirme Özeti</p>
                        <p className="text-base text-muted-foreground">
                          {detailAnalysis.contentAnalysis.summary}
                        </p>

                        <div className="space-y-1.5">
                          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-4" />
                            Güçlü Yönler
                          </p>
                          <ul className="list-inside list-disc space-y-0.5 text-base text-muted-foreground">
                            {detailAnalysis.contentAnalysis.strengths.map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1.5">
                          <p className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="size-4" />
                            Gelişime Açık Yönler
                          </p>
                          <ul className="list-inside list-disc space-y-0.5 text-base text-muted-foreground">
                            {detailAnalysis.contentAnalysis.weaknesses.map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1.5">
                          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
                            <Lightbulb className="size-4" />
                            Öneriler
                          </p>
                          <ul className="list-inside list-disc space-y-0.5 text-base text-muted-foreground">
                            {detailAnalysis.contentAnalysis.improvementSuggestions.map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-base text-muted-foreground">
                  Bu rapor için değerlendirme detayı henüz bulunmuyor.
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
