"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  FileClock,
  FileText,
  FolderKanban,
  Gavel,
  GraduationCap,
  Layers,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  Plus,
  Rocket,
  ShieldCheck,
  Tag,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RouteGuard } from "@/components/auth/route-guard";
import { AppHeader } from "@/components/layout/app-header";
import { AnnouncementsCard } from "@/components/announcements-card";
import { AmbientGlow } from "@/components/landing/ambient-glow";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore, useCurrentUser } from "@/store/useAppStore";
import * as usersService from "@/services/users.service";
import { logout } from "@/services/auth.service";
import { refreshReports, refreshCategories, refreshEvaluations } from "@/services/sync";
import type { Category, JudgeEvaluation, JudgeWorkStatus, Report, User } from "@/types";

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
  onOpen: (reportId: string) => void;
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
                onClick={() => onOpen(report.id)}
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

/** Bir hakemin kendi ilerlemesi — rapor.status birden fazla hakem varsa toplam durumu
 * yansıtır, bu yüzden "bu hakem ne yaptı" sorusu kendi değerlendirme kaydına bakılarak
 * cevaplanır. */
function countByCategory(
  reports: Report[],
  categoryId: string,
  myEvaluationByReportId: Map<string, JudgeEvaluation>,
) {
  const inCategory = reports.filter((r) => r.categoryId === categoryId);
  return {
    total: inCategory.length,
    pending: inCategory.filter((r) => !myEvaluationByReportId.has(r.id)).length,
    inReview: inCategory.filter((r) => myEvaluationByReportId.get(r.id)?.status === "draft")
      .length,
    completed: inCategory.filter((r) => myEvaluationByReportId.get(r.id)?.status === "submitted")
      .length,
  };
}

const MAX_CV_SIZE = 10 * 1024 * 1024; // 10 MB

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function categoryIcon(slug: string) {
  if (slug === "yapay-zeka") return Layers;
  if (slug === "insansiz-sistemler") return Rocket;
  if (slug === "siber-guvenlik") return ShieldCheck;
  return Layers;
}

const KVKK_TEXT =
  "Ludex, hakem başvurunuz kapsamında paylaştığınız kimlik, iletişim, mesleki ve akademik verileri " +
  "yalnızca hakem uygunluğunun değerlendirilmesi, rapor ataması ve değerlendirme süreçlerinin " +
  "yürütülmesi amacıyla 6698 sayılı KVKK'ya uygun şekilde işler. Verileriniz üçüncü taraflarla " +
  "paylaşılmaz; erişim, düzeltme ve silme talepleriniz için destek ekibimizle iletişime " +
  "geçebilirsiniz.";

const AGREEMENT_TEXT =
  "Hakemlik Sözleşmesi kapsamında; incelediğiniz raporların içeriğini gizli tutmayı, " +
  "değerlendirmelerinizi tarafsız ve şartnameye uygun şekilde yapmayı, çıkar çatışması " +
  "yaratabilecek bir durum fark ettiğinizde ilgili raporu değerlendirmeden önce yönetime " +
  "bildirmeyi kabul edersiniz.";

type ApplicationStep = 1 | 2;

function StepIndicator({ step }: { step: ApplicationStep }) {
  const steps: { n: ApplicationStep; label: string }[] = [
    { n: 1, label: "Kişisel & Mesleki Bilgiler" },
    { n: 2, label: "Uzmanlık & Durum" },
  ];

  return (
    <div className="mb-6 flex items-center">
      {steps.map((s, i) => (
        <div key={s.n} className={cn("flex items-center", i === 0 ? "flex-1" : "")}>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                step === s.n
                  ? "border-primary bg-primary text-primary-foreground"
                  : step > s.n
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground",
              )}
            >
              {step > s.n ? <Check className="size-3.5" /> : s.n}
            </div>
            <span
              className={cn(
                "hidden text-sm font-medium sm:inline",
                step === s.n ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
          </div>
          {i === 0 && <div className="mx-3 h-px flex-1 bg-border" />}
        </div>
      ))}
    </div>
  );
}

function JudgeApplicationForm({ user, categories }: { user: User; categories: Category[] }) {
  const router = useRouter();

  const [step, setStep] = useState<ApplicationStep>(1);

  const [jobTitle, setJobTitle] = useState(user.jobTitle ?? "");
  const [institution, setInstitution] = useState(user.department ?? "");
  const [expertiseArea, setExpertiseArea] = useState(user.expertiseArea ?? "");
  const [academicProfileUrl, setAcademicProfileUrl] = useState(user.academicProfileUrl ?? "");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvDragging, setCvDragging] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>(user.categoryIds);
  const [customTags, setCustomTags] = useState<string[]>(user.customExpertiseTags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [workStatus, setWorkStatus] = useState<JudgeWorkStatus>(user.judgeWorkStatus ?? "working");
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [legalDialog, setLegalDialog] = useState<"kvkk" | "agreement" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const expertiseCount = selectedIds.length + customTags.length;

  function toggleCategory(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function addCustomTag() {
    const value = tagDraft.trim();
    if (!value) return;
    if (customTags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setTagDraft("");
      return;
    }
    setCustomTags((prev) => [...prev, value]);
    setTagDraft("");
  }

  function removeCustomTag(tag: string) {
    setCustomTags((prev) => prev.filter((t) => t !== tag));
  }

  function validateAndSetCv(candidate: File) {
    setCvError(null);
    const isPdf =
      candidate.type === "application/pdf" || candidate.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setCvError("Sadece PDF formatında dosya yükleyebilirsin.");
      return;
    }
    if (candidate.size > MAX_CV_SIZE) {
      setCvError("Dosya boyutu 10 MB'ı geçemez.");
      return;
    }
    setCvFile(candidate);
  }

  function handleCvDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setCvDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validateAndSetCv(dropped);
  }

  const step1Valid = jobTitle.trim().length > 0 && institution.trim().length > 0;

  function handleContinue(e: FormEvent) {
    e.preventDefault();
    if (!step1Valid) {
      toast.error("Devam etmeden önce unvan ve kurum bilgisini doldur.");
      return;
    }
    setStep(2);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (expertiseCount === 0) {
      toast.error("En az bir uzmanlık alanı seçmelisin.");
      return;
    }
    if (!agreementAccepted) {
      toast.error("KVKK Aydınlatma Metni ve Hakemlik Sözleşmesi'ni onaylamalısın.");
      return;
    }

    setSubmitting(true);
    try {
      await usersService.submitJudgeApplication(user.id, {
        categoryIds: selectedIds,
        workStatus,
        jobTitle: jobTitle.trim(),
        department: institution.trim(),
        expertiseArea: expertiseArea.trim() || undefined,
        academicProfileUrl: academicProfileUrl.trim() || undefined,
        cvFileName: cvFile?.name,
        customExpertiseTags: customTags,
        agreementAccepted: true,
      });
      toast.success("Başvurun gönderildi, admin onayını bekliyor.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Başvuru gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative mx-auto max-w-2xl">
      <AmbientGlow className="-z-10 opacity-50" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 gap-1.5"
        onClick={async () => {
          await logout();
          router.replace("/login");
        }}
      >
        <ArrowLeft className="size-4" />
        Geri Dön
      </Button>

      <div className="mb-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Gavel className="size-6" />
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Hakem Başvurunu Tamamla</h1>
        <p className="mt-1 text-base leading-relaxed text-muted-foreground">
          Mesleki bilgilerini ve uzmanlık alanlarını paylaş, admin onayladıktan sonra panele
          erişebilirsin.
        </p>
      </div>

      <StepIndicator step={step} />

      <Card className="overflow-hidden border-border/60 bg-card/70 shadow-[0_0_60px_-24px_var(--brand-glow-1)] backdrop-blur-sm">
        <CardContent className="pt-6">
          {step === 1 && (
            <form onSubmit={handleContinue} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="app-job-title" className="flex items-center gap-1.5">
                    <BadgeCheck className="size-3.5 text-primary" />
                    Unvan / Rol
                  </Label>
                  <Input
                    id="app-job-title"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Örn: Dr. Öğr. Üyesi, Kıdemli Yazılım Mühendisi"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-institution" className="flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-primary" />
                    Kurum / Şirket / Üniversite
                  </Label>
                  <Input
                    id="app-institution"
                    required
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Örn: Orta Doğu Teknik Üniversitesi"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="app-expertise-area" className="flex items-center gap-1.5">
                  <GraduationCap className="size-3.5 text-primary" />
                  Bölüm / Uzmanlık Dalı
                </Label>
                <Input
                  id="app-expertise-area"
                  value={expertiseArea}
                  onChange={(e) => setExpertiseArea(e.target.value)}
                  placeholder="Örn: Bilgisayar Mühendisliği, Havacılık ve Uzay"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="app-academic-link" className="flex items-center gap-1.5">
                  <Link2 className="size-3.5 text-primary" />
                  Akademik / Profesyonel Bağlantı
                </Label>
                <Input
                  id="app-academic-link"
                  type="url"
                  value={academicProfileUrl}
                  onChange={(e) => setAcademicProfileUrl(e.target.value)}
                  placeholder="LinkedIn, YÖK Akademik veya Google Scholar linki"
                />
              </div>

              <div className="space-y-2">
                <Label>Özgeçmiş / CV (PDF)</Label>
                {!cvFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setCvDragging(true);
                    }}
                    onDragLeave={() => setCvDragging(false)}
                    onDrop={handleCvDrop}
                    onClick={() => cvInputRef.current?.click()}
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200 active:scale-[0.98]",
                      cvDragging
                        ? "scale-[1.01] border-primary bg-primary/5"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <UploadCloud className="size-7 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Dosyayı sürükle bırak veya <span className="text-primary">gözat</span>
                    </p>
                    <p className="text-sm text-muted-foreground">PDF, maksimum 10 MB (opsiyonel)</p>
                    <input
                      ref={cvInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const selected = e.target.files?.[0];
                        if (selected) validateAndSetCv(selected);
                        e.target.value = "";
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="size-5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{cvFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(cvFile.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setCvFile(null)}
                      aria-label="CV'yi kaldır"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                )}
                {cvError && <p className="text-sm text-destructive">{cvError}</p>}
              </div>

              <Button type="submit" className="w-full gap-1.5">
                Devam Et
                <ArrowRight className="size-4" />
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>Uzmanlık Alanların</Label>
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1",
                      expertiseCount > 0
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
                    )}
                  >
                    {expertiseCount} seçildi
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">En az 1 uzmanlık alanı seçiniz.</p>

                <div className="grid gap-2 sm:grid-cols-2">
                  {categories.map((c) => {
                    const Icon = categoryIcon(c.slug);
                    const active = selectedIds.includes(c.id);
                    return (
                      <Label
                        key={c.id}
                        htmlFor={`cat-${c.id}`}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-normal transition-colors",
                          active ? "border-primary bg-primary/5" : "border-border",
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-lg",
                            active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <span className="flex-1">{c.name}</span>
                        <Checkbox
                          id={`cat-${c.id}`}
                          checked={active}
                          onCheckedChange={() => toggleCategory(c.id)}
                        />
                      </Label>
                    );
                  })}
                </div>

                {customTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {customTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                        <Tag className="size-3" />
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeCustomTag(tag)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                          aria-label={`${tag} etiketini kaldır`}
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomTag();
                      }
                    }}
                    placeholder="Diğer / Etiket Ekle (Örn: Kuantum Hesaplama)"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addCustomTag}>
                    <Plus className="size-4" />
                  </Button>
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

              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                <Checkbox
                  id="agreement"
                  checked={agreementAccepted}
                  onCheckedChange={(v) => setAgreementAccepted(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="agreement" className="text-sm font-normal leading-relaxed text-muted-foreground">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setLegalDialog("kvkk");
                    }}
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    KVKK Aydınlatma Metni
                  </button>
                  {"'"}ni ve{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setLegalDialog("agreement");
                    }}
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    Hakemlik Sözleşmesi
                  </button>
                  {"'"}ni okudum, kabul ediyorum.
                </Label>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="size-4" />
                  Geri
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1 gap-1.5">
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  Başvuruyu Gönder
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Dialog open={legalDialog !== null} onOpenChange={(open) => !open && setLegalDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {legalDialog === "kvkk" ? "KVKK Aydınlatma Metni" : "Hakemlik Sözleşmesi"}
            </DialogTitle>
            <DialogDescription className="max-h-[50vh] overflow-y-auto text-left">
              {legalDialog === "kvkk" ? KVKK_TEXT : AGREEMENT_TEXT}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
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
  const evaluations = useAppStore((s) => s.evaluations);

  const [isLoading, setIsLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    let active = true;
    Promise.all([refreshReports(), refreshCategories(), refreshEvaluations()])
      .catch((error) => console.error("Hakem paneli verileri alınamadı:", error))
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const myReports = useMemo(
    () => (user ? reports.filter((r) => r.assignedJudgeIds.includes(user.id)) : []),
    [reports, user],
  );

  const myEvaluationByReportId = useMemo(() => {
    const map = new Map<string, JudgeEvaluation>();
    if (user) {
      evaluations.forEach((e) => {
        if (e.judgeId === user.id) map.set(e.reportId, e);
      });
    }
    return map;
  }, [evaluations, user]);

  const myCategories = useMemo(() => {
    const categoryIds = new Set(myReports.map((r) => r.categoryId));
    return categories.filter((c) => categoryIds.has(c.id));
  }, [categories, myReports]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;
  const categoryReports = selectedCategory
    ? myReports.filter((r) => r.categoryId === selectedCategory.id)
    : [];

  const pending = categoryReports.filter((r) => !myEvaluationByReportId.has(r.id));
  const inReview = categoryReports.filter(
    (r) => myEvaluationByReportId.get(r.id)?.status === "draft",
  );
  const completed = categoryReports.filter(
    (r) => myEvaluationByReportId.get(r.id)?.status === "submitted",
  );

  function handleOpen(reportId: string) {
    setStartingId(reportId);
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

              <AnnouncementsCard />

              {myCategories.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-base text-muted-foreground">
                  Henüz sana atanmış bir rapor yok.
                </p>
              ) : (
                <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
                  {myCategories.map((category) => {
                    const counts = countByCategory(myReports, category.id, myEvaluationByReportId);
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
                {selectedCategory.evaluationDeadline && pending.length + inReview.length > 0 && (
                  <div
                    className={cn(
                      "mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                      new Date(selectedCategory.evaluationDeadline) < new Date()
                        ? "border-destructive/30 bg-destructive/5 text-destructive"
                        : "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {new Date(selectedCategory.evaluationDeadline) < new Date() ? (
                      <AlertTriangle className="size-4 shrink-0" />
                    ) : (
                      <CalendarClock className="size-4 shrink-0" />
                    )}
                    <span>
                      {new Date(selectedCategory.evaluationDeadline) < new Date()
                        ? "Değerlendirme son tarihi geçti: "
                        : "Değerlendirmeleri bitirmen gereken son tarih: "}
                      {new Date(selectedCategory.evaluationDeadline).toLocaleString("tr-TR")}
                    </span>
                  </div>
                )}
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
