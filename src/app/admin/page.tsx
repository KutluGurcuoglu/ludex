"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  FileClock,
  FileText,
  Gavel,
  LayoutDashboard,
  LayoutGrid,
  List,
  ListChecks,
  Loader2,
  Menu,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  UploadCloud,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RouteGuard } from "@/components/auth/route-guard";
import { AppHeader } from "@/components/layout/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/useAppStore";
import * as reportsService from "@/services/reports.service";
import * as categoriesService from "@/services/categories.service";
import * as usersService from "@/services/users.service";
import * as evaluationsService from "@/services/evaluations.service";
import type { Category, JudgeApprovalStatus, JudgeWorkStatus, ReportStatus } from "@/types";

const WORK_STATUS_LABEL: Record<JudgeWorkStatus, string> = {
  working: "Çalışıyor",
  studying: "Öğrenci",
  both: "Çalışıyor + Öğrenci",
};

const APPROVAL_STATUS_BADGE_CLASS: Record<JudgeApprovalStatus, string> = {
  pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  approved:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  rejected:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

const APPROVAL_STATUS_LABEL: Record<JudgeApprovalStatus, string> = {
  pending: "Onay Bekliyor",
  approved: "Onaylı",
  rejected: "Reddedildi",
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending_assignment: "Atama Bekliyor",
  assigned: "Atandı",
  in_review: "Değerlendirmede",
  completed: "Tamamlandı",
};

const STATUS_BADGE_CLASS: Record<ReportStatus, string> = {
  pending_assignment:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  assigned:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  in_review:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300",
  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
};

type Section =
  | "overview"
  | "pool"
  | "judges"
  | "judgeApplications"
  | "contestants"
  | "competitions"
  | "criteria";

const SECTION_META: Record<Section, { label: string; icon: typeof LayoutDashboard }> = {
  overview: { label: "Genel Bakış", icon: LayoutDashboard },
  pool: { label: "Rapor Havuzu", icon: FileText },
  judges: { label: "Hakemler", icon: Gavel },
  judgeApplications: { label: "Hakem Başvuruları", icon: UserCheck },
  contestants: { label: "Yarışmacılar", icon: Users },
  competitions: { label: "Yarışmalar", icon: Trophy },
  criteria: { label: "Değerlendirme Kriterleri", icon: ListChecks },
};

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type Accent = "primary" | "amber" | "violet" | "emerald";

const ACCENT_CLASS: Record<Accent, string> = {
  primary: "bg-primary/10 text-primary",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

function StatCard({
  icon: Icon,
  label,
  value,
  accent = "primary",
}: {
  icon: typeof FileText;
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

function AdminSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 pt-6">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DocumentDropzone({
  label,
  hint,
  currentFileName,
  onFile,
}: {
  label: string;
  hint: string;
  currentFileName?: string;
  onFile: (file: File) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handle(file: File) {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error("Sadece PDF formatında dosya yükleyebilirsin.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Dosya boyutu 20 MB'ı geçemez.");
      return;
    }
    onFile(file);
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handle(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
        )}
      >
        <UploadCloud className="size-6 text-muted-foreground" />
        {currentFileName ? (
          <p className="max-w-full truncate text-sm font-medium">{currentFileName}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{hint}</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handle(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function CompetitionEditSheet({ competition }: { competition: Category }) {
  const [name, setName] = useState(competition.name);
  const [description, setDescription] = useState(competition.description ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingSpec, setUploadingSpec] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    await categoriesService.updateCategory(competition.id, {
      name: name.trim(),
      description: description.trim(),
    });
    setSaving(false);
    toast.success("Yarışma bilgileri güncellendi.");
  }

  async function handleSpecFile(file: File) {
    setUploadingSpec(true);
    await categoriesService.uploadCategorySpecification(competition.id, {
      fileName: file.name,
      fileUrl: "/mock-docs/specification.pdf",
      fileSizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
    });
    setUploadingSpec(false);
    toast.success("Şartname yüklendi.");
  }

  async function handleTemplateFile(file: File) {
    setUploadingTemplate(true);
    await categoriesService.uploadCategoryTemplate(competition.id, {
      fileName: file.name,
      fileUrl: "/mock-docs/template.pdf",
      fileSizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
    });
    setUploadingTemplate(false);
    toast.success("Rapor şablonu yüklendi.");
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{competition.name}</SheetTitle>
        <SheetDescription>
          Yarışma bilgilerini düzenle, şartname ve rapor şablonu yükle.
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 px-4 pb-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comp-name">Yarışma Adı</Label>
            <Input id="comp-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comp-desc">Açıklama</Label>
            <Textarea
              id="comp-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Yarışma hakkında kısa bir açıklama"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={saving}
            className="gap-1.5 transition-transform active:scale-[0.97]"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </form>

        <Separator />

        <div className={uploadingSpec ? "pointer-events-none opacity-60" : ""}>
          <DocumentDropzone
            label="Şartname (PDF)"
            hint={uploadingSpec ? "Yükleniyor..." : "Sürükle bırak veya tıkla · PDF, maks. 20 MB"}
            currentFileName={competition.specification?.fileName}
            onFile={handleSpecFile}
          />
        </div>

        <div className={uploadingTemplate ? "pointer-events-none opacity-60" : ""}>
          <DocumentDropzone
            label="Rapor Şablonu (PDF)"
            hint={uploadingTemplate ? "Yükleniyor..." : "Sürükle bırak veya tıkla · PDF, maks. 20 MB"}
            currentFileName={competition.reportTemplate?.fileName}
            onFile={handleTemplateFile}
          />
        </div>
      </div>
    </>
  );
}

export default function AdminPage() {
  return (
    <RouteGuard allow={["admin"]}>
      <AdminDashboard />
    </RouteGuard>
  );
}

function AdminDashboard() {
  const categories = useAppStore((s) => s.categories);
  const users = useAppStore((s) => s.users);
  const reports = useAppStore((s) => s.reports);
  const evaluations = useAppStore((s) => s.evaluations);
  const scoreCriteria = useAppStore((s) => s.scoreCriteria);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      reportsService.getReports(),
      categoriesService.getCategories(),
      usersService.getUsers(),
      evaluationsService.getEvaluations(),
      evaluationsService.getScoreCriteria(),
    ]).then(() => {
      if (active) setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const judges = useMemo(() => users.filter((u) => u.role === "judge"), [users]);
  const approvedJudges = useMemo(
    () => judges.filter((j) => j.judgeApprovalStatus === "approved"),
    [judges],
  );
  const pendingJudgeApplications = useMemo(
    () => judges.filter((j) => (j.judgeApprovalStatus ?? "pending") === "pending" && j.categoryIds.length > 0),
    [judges],
  );
  const contestants = useMemo(() => users.filter((u) => u.role === "contestant"), [users]);
  const maxTotalScore = useMemo(
    () => scoreCriteria.reduce((sum, c) => sum + c.maxScore, 0),
    [scoreCriteria],
  );

  const [navOpen, setNavOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeSection, setActiveSection] = useState<Section>("overview");

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkJudgeId, setBulkJudgeId] = useState("");
  const [pendingAssignment, setPendingAssignment] = useState<{
    reportIds: string[];
    judgeId: string;
    label: string;
  } | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);

  const [selectedJudgeId, setSelectedJudgeId] = useState<string | null>(null);
  const [selectedContestantId, setSelectedContestantId] = useState<string | null>(null);

  const [judgeSearch, setJudgeSearch] = useState("");
  const [contestantSearch, setContestantSearch] = useState("");

  const [createCompetitionOpen, setCreateCompetitionOpen] = useState(false);
  const [creatingCompetition, setCreatingCompetition] = useState(false);
  const [newCompetitionName, setNewCompetitionName] = useState("");
  const [newCompetitionDescription, setNewCompetitionDescription] = useState("");
  const [editCompetitionId, setEditCompetitionId] = useState<string | null>(null);

  const [criterionDialogOpen, setCriterionDialogOpen] = useState(false);
  const [editingCriterionId, setEditingCriterionId] = useState<string | null>(null);
  const [criterionLabel, setCriterionLabel] = useState("");
  const [criterionMaxScore, setCriterionMaxScore] = useState("");
  const [criterionDescription, setCriterionDescription] = useState("");
  const [savingCriterion, setSavingCriterion] = useState(false);
  const [deletingCriterionId, setDeletingCriterionId] = useState<string | null>(null);
  const [autoApprovingJudges, setAutoApprovingJudges] = useState(false);

  const filteredJudges = useMemo(() => {
    const q = judgeSearch.trim().toLowerCase();
    if (!q) return judges;
    return judges.filter(
      (j) =>
        j.name.toLowerCase().includes(q) ||
        j.email.toLowerCase().includes(q) ||
        j.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
    );
  }, [judges, judgeSearch]);

  const filteredContestants = useMemo(() => {
    const q = contestantSearch.trim().toLowerCase();
    if (!q) return contestants;
    return contestants.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
    );
  }, [contestants, contestantSearch]);

  async function handleCreateCompetition(e: FormEvent) {
    e.preventDefault();
    if (!newCompetitionName.trim()) return;
    setCreatingCompetition(true);
    const created = await categoriesService.createCategory({
      name: newCompetitionName.trim(),
      description: newCompetitionDescription.trim() || undefined,
    });
    setCreatingCompetition(false);
    toast.success(`"${created.name}" yarışması oluşturuldu.`);
    setNewCompetitionName("");
    setNewCompetitionDescription("");
    setCreateCompetitionOpen(false);
    setEditCompetitionId(created.id);
  }

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports
      .filter((r) => {
        if (categoryFilter !== "all" && r.categoryId !== categoryFilter) return false;
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (
          query &&
          !r.title.toLowerCase().includes(query) &&
          !r.contestantName.toLowerCase().includes(query)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [reports, categoryFilter, statusFilter, search]);

  const stats = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((r) => r.status === "pending_assignment").length,
      inReview: reports.filter((r) => r.status === "in_review").length,
      completed: reports.filter((r) => r.status === "completed").length,
    }),
    [reports],
  );

  const allSelected = filteredReports.length > 0 && selectedIds.length === filteredReports.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : filteredReports.map((r) => r.id));
  }

  function judgesForCategory(categoryId: string) {
    return [...approvedJudges].sort((a, b) => {
      const aMatch = a.categoryIds.includes(categoryId) ? 0 : 1;
      const bMatch = b.categoryIds.includes(categoryId) ? 0 : 1;
      return aMatch - bMatch;
    });
  }

  function requestAssign(reportIds: string[], judgeId: string, label: string) {
    if (!judgeId) return;
    setPendingAssignment({ reportIds, judgeId, label });
  }

  async function confirmAssign() {
    if (!pendingAssignment) return;
    setAssigning(true);
    await reportsService.assignReports(pendingAssignment.reportIds, pendingAssignment.judgeId);
    setAssigning(false);
    const judge = judges.find((j) => j.id === pendingAssignment.judgeId);
    toast.success(`${pendingAssignment.label} ${judge?.name ?? "hakeme"} atandı.`);
    setPendingAssignment(null);
    setSelectedIds([]);
    setBulkJudgeId("");
  }

  function openCreateCriterion() {
    setEditingCriterionId(null);
    setCriterionLabel("");
    setCriterionMaxScore("");
    setCriterionDescription("");
    setCriterionDialogOpen(true);
  }

  function openEditCriterion(criterionId: string) {
    const criterion = scoreCriteria.find((c) => c.id === criterionId);
    if (!criterion) return;
    setEditingCriterionId(criterionId);
    setCriterionLabel(criterion.label);
    setCriterionMaxScore(String(criterion.maxScore));
    setCriterionDescription(criterion.description ?? "");
    setCriterionDialogOpen(true);
  }

  async function handleSaveCriterion(e: FormEvent) {
    e.preventDefault();
    const maxScore = Number(criterionMaxScore);
    if (!criterionLabel.trim() || !Number.isFinite(maxScore) || maxScore <= 0) return;

    setSavingCriterion(true);
    if (editingCriterionId) {
      await evaluationsService.updateScoreCriterion(editingCriterionId, {
        label: criterionLabel.trim(),
        maxScore,
        description: criterionDescription.trim() || undefined,
      });
    } else {
      await evaluationsService.addScoreCriterion({
        label: criterionLabel.trim(),
        maxScore,
        description: criterionDescription.trim() || undefined,
      });
    }
    setSavingCriterion(false);
    toast.success(editingCriterionId ? "Kriter güncellendi." : "Yeni kriter eklendi.");
    setCriterionDialogOpen(false);
  }

  async function handleDeleteCriterion(criterionId: string) {
    setDeletingCriterionId(criterionId);
    await evaluationsService.deleteScoreCriterion(criterionId);
    setDeletingCriterionId(null);
    toast.success("Kriter silindi.");
  }

  async function handleReviewJudge(userId: string, decision: "approved" | "rejected") {
    await usersService.reviewJudgeApplication(userId, decision);
    const judge = judges.find((j) => j.id === userId);
    toast.success(
      decision === "approved"
        ? `${judge?.name ?? "Hakem"} onaylandı.`
        : `${judge?.name ?? "Hakem"} başvurusu reddedildi.`,
    );
  }

  async function handleAutoApproveJudges() {
    if (pendingJudgeApplications.length === 0) {
      toast.info("Bekleyen hakem başvurusu yok.");
      return;
    }
    setAutoApprovingJudges(true);
    await Promise.all(
      pendingJudgeApplications.map((j) => usersService.reviewJudgeApplication(j.id, "approved")),
    );
    setAutoApprovingJudges(false);
    toast.success(`${pendingJudgeApplications.length} hakem başvurusu otomatik onaylandı.`);
  }

  async function handleAutoAssign() {
    const pending = reports.filter((r) => r.status === "pending_assignment");
    if (pending.length === 0) {
      toast.info("Atama bekleyen rapor yok.");
      return;
    }
    if (approvedJudges.length === 0) {
      toast.error("Sistemde onaylı hakem yok.");
      return;
    }

    const loadMap = new Map<string, number>();
    approvedJudges.forEach((j) => {
      const active = reports.filter(
        (r) => r.assignedJudgeId === j.id && (r.status === "assigned" || r.status === "in_review"),
      ).length;
      loadMap.set(j.id, active);
    });

    setAutoAssigning(true);
    const assignments: Promise<void>[] = [];
    pending.forEach((report) => {
      const candidates = approvedJudges.filter((j) => j.categoryIds.includes(report.categoryId));
      const pool = candidates.length > 0 ? candidates : approvedJudges;
      let chosen = pool[0];
      pool.forEach((j) => {
        if ((loadMap.get(j.id) ?? 0) < (loadMap.get(chosen.id) ?? 0)) chosen = j;
      });
      assignments.push(reportsService.assignReports([report.id], chosen.id));
      loadMap.set(chosen.id, (loadMap.get(chosen.id) ?? 0) + 1);
    });

    await Promise.all(assignments);
    setAutoAssigning(false);
    toast.success(`${assignments.length} rapor otomatik olarak atandı.`);
  }

  const selectedJudge = judges.find((j) => j.id === selectedJudgeId) ?? null;
  const selectedContestant = contestants.find((c) => c.id === selectedContestantId) ?? null;

  const selectedJudgeReports = selectedJudge
    ? reports.filter((r) => r.assignedJudgeId === selectedJudge.id)
    : [];
  const selectedJudgeCompletedEvaluations = selectedJudge
    ? selectedJudgeReports
        .filter((r) => r.status === "completed")
        .map((r) => ({ report: r, evaluation: evaluations.find((e) => e.reportId === r.id) }))
        .filter((x): x is { report: (typeof selectedJudgeReports)[number]; evaluation: NonNullable<(typeof x)["evaluation"]> } =>
          Boolean(x.evaluation),
        )
    : [];

  const selectedContestantReports = selectedContestant
    ? reports.filter((r) => r.contestantId === selectedContestant.id)
    : [];

  const editingCompetition = categories.find((c) => c.id === editCompetitionId) ?? null;

  if (isLoading) {
    return (
      <>
        <AppHeader subtitle={SECTION_META.overview.label} />
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
      <AppHeader subtitle={SECTION_META[activeSection].label} />
      <div className="min-h-[calc(100vh-4rem)]">
        <div className="sticky top-16 z-30 flex items-center justify-between border-b border-border/60 bg-background/80 px-6 py-3 backdrop-blur-md md:px-12">
          <Button variant="outline" size="icon" onClick={() => setNavOpen(true)}>
            <Menu className="size-4" />
          </Button>
          <div className="flex items-center gap-2">
            {pendingJudgeApplications.length > 0 && (
              <Badge
                variant="outline"
                className={cn("cursor-pointer gap-1.5", APPROVAL_STATUS_BADGE_CLASS.pending)}
                onClick={() => setActiveSection("judgeApplications")}
              >
                <UserCheck className="size-3" />
                {pendingJudgeApplications.length} Bekleyen Başvuru
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
            {(["judges", "judgeApplications", "contestants", "competitions", "criteria"] as Section[]).includes(
              activeSection,
            ) && (
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

        <main className="w-full px-6 py-8 md:px-12">
          {activeSection === "overview" && (
            <div>
              <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Yönetici Girişi Sağlandı
                </h1>
                <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                  Rapor havuzunu yönet, hakemlere atama yap, ilerlemeyi takip et.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard icon={FileText} label="Toplam Rapor" value={stats.total} />
                <StatCard icon={FileClock} label="Atama Bekliyor" value={stats.pending} accent="amber" />
                <StatCard icon={Clock} label="Değerlendirmede" value={stats.inReview} accent="violet" />
                <StatCard icon={CheckCircle2} label="Tamamlandı" value={stats.completed} accent="emerald" />
                <StatCard icon={Gavel} label="Toplam Hakem" value={judges.length} />
                <StatCard icon={Users} label="Toplam Yarışmacı" value={contestants.length} />
              </div>
            </div>
          )}

          {activeSection === "pool" && (
            <div className="space-y-4">
              <Card>
                <CardContent className="flex flex-wrap items-center gap-3 pt-6">
                  <Input
                    placeholder="Rapor veya yarışmacı ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-xs"
                  />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[190px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Kategoriler</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[190px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Durumlar</SelectItem>
                      {(Object.keys(STATUS_LABEL) as ReportStatus[]).map((key) => (
                        <SelectItem key={key} value={key}>
                          {STATUS_LABEL[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    disabled={autoAssigning}
                    className="ml-auto gap-1.5 transition-transform active:scale-[0.97]"
                    onClick={handleAutoAssign}
                  >
                    {autoAssigning ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    {autoAssigning ? "Atanıyor..." : "Otomatik Ata"}
                  </Button>
                </CardContent>
              </Card>

              {selectedIds.length > 0 && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="flex flex-wrap items-center gap-3 pt-6">
                    <span className="text-base font-medium">{selectedIds.length} rapor seçildi</span>
                    <Select value={bulkJudgeId} onValueChange={setBulkJudgeId}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Hakem seç" />
                      </SelectTrigger>
                      <SelectContent>
                        {approvedJudges.map((j) => (
                          <SelectItem key={j.id} value={j.id}>
                            {j.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      disabled={!bulkJudgeId}
                      onClick={() =>
                        requestAssign(selectedIds, bulkJudgeId, `${selectedIds.length} rapor`)
                      }
                      className="transition-transform active:scale-[0.97]"
                    >
                      Seçilenleri Ata
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                      Seçimi Temizle
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card className="overflow-hidden py-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                        </TableHead>
                        <TableHead>Rapor</TableHead>
                        <TableHead>Yarışmacı</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Hakem</TableHead>
                        <TableHead>Tarih</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-base text-muted-foreground">
                            Filtrelerle eşleşen rapor bulunamadı.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredReports.map((report) => {
                          const category = categories.find((c) => c.id === report.categoryId);
                          return (
                            <TableRow key={report.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedIds.includes(report.id)}
                                  onCheckedChange={() => toggleSelect(report.id)}
                                />
                              </TableCell>
                              <TableCell className="max-w-[240px]">
                                <p className="truncate font-medium">{report.title}</p>
                                <p className="truncate text-sm text-muted-foreground">
                                  {report.fileName} &middot; {formatFileSize(report.fileSizeBytes)}
                                </p>
                              </TableCell>
                              <TableCell className="text-base">{report.contestantName}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{category?.name ?? "—"}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={STATUS_BADGE_CLASS[report.status]}>
                                  {STATUS_LABEL[report.status]}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={report.assignedJudgeId ?? ""}
                                  onValueChange={(v) => requestAssign([report.id], v, report.title)}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Ata..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {judgesForCategory(report.categoryId).map((j) => (
                                      <SelectItem key={j.id} value={j.id}>
                                        {j.name}
                                        {j.categoryIds.includes(report.categoryId) ? " ?" : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                {formatDate(report.submittedAt)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          )}

          {activeSection === "judges" && (
            <div className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="İsim, telefon veya e-posta ile ara..."
                  value={judgeSearch}
                  onChange={(e) => setJudgeSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
              {filteredJudges.map((judge) => {
                const activeCount = reports.filter(
                  (r) => r.assignedJudgeId === judge.id && r.status !== "completed",
                ).length;
                const completedCount = reports.filter(
                  (r) => r.assignedJudgeId === judge.id && r.status === "completed",
                ).length;
                const expertise = categories.filter((c) => judge.categoryIds.includes(c.id));
                const approvalBadge = (
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0",
                      APPROVAL_STATUS_BADGE_CLASS[judge.judgeApprovalStatus ?? "pending"],
                    )}
                  >
                    {APPROVAL_STATUS_LABEL[judge.judgeApprovalStatus ?? "pending"]}
                  </Badge>
                );
                const expertiseBadges =
                  expertise.length > 0 ? (
                    expertise.map((c) => (
                      <Badge key={c.id} variant="secondary">
                        {c.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Uzmanlık belirtilmemiş</span>
                  );

                if (viewMode === "list") {
                  return (
                    <Card
                      key={judge.id}
                      className="cursor-pointer py-0 transition-colors hover:border-primary/40"
                      onClick={() => setSelectedJudgeId(judge.id)}
                    >
                      <CardContent className="flex flex-wrap items-center gap-4 px-5 py-4">
                        <Avatar>
                          <AvatarFallback>{judge.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold">{judge.name}</p>
                          <p className="truncate text-sm text-muted-foreground">{judge.email}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">{expertiseBadges}</div>
                        {approvalBadge}
                        <div className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
                          <span>{activeCount} aktif</span>
                          <span>{completedCount} tamam</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <Card
                    key={judge.id}
                    className="cursor-pointer transition-colors hover:border-primary/40"
                    onClick={() => setSelectedJudgeId(judge.id)}
                  >
                    <CardContent className="space-y-4 pt-6">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{judge.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold">{judge.name}</p>
                          <p className="truncate text-sm text-muted-foreground">{judge.email}</p>
                        </div>
                        {approvalBadge}
                      </div>

                      <div className="flex flex-wrap gap-1.5">{expertiseBadges}</div>

                      <Separator />

                      <div className="flex items-center justify-between text-base">
                        <span className="text-muted-foreground">Aktif Rapor</span>
                        <span className="font-semibold">{activeCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-base">
                        <span className="text-muted-foreground">Tamamlanan</span>
                        <span className="font-semibold">{completedCount}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              </div>
            </div>
          )}

          {activeSection === "judgeApplications" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-base text-muted-foreground">
                  {pendingJudgeApplications.length} bekleyen başvuru
                </p>
                <Button
                  variant="outline"
                  disabled={autoApprovingJudges || pendingJudgeApplications.length === 0}
                  className="gap-1.5 transition-transform active:scale-[0.97]"
                  onClick={handleAutoApproveJudges}
                >
                  {autoApprovingJudges ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {autoApprovingJudges ? "Onaylanıyor..." : "Tümünü Otomatik Onayla"}
                </Button>
              </div>

              {pendingJudgeApplications.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-base text-muted-foreground">
                  Bekleyen hakem başvurusu yok.
                </p>
              ) : (
                <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
                  {pendingJudgeApplications.map((judge) => {
                    const expertise = categories.filter((c) => judge.categoryIds.includes(c.id));
                    const actions = (
                      <>
                        <Button
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => handleReviewJudge(judge.id, "approved")}
                        >
                          <CheckCircle2 className="size-4" />
                          Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1.5 text-destructive hover:bg-destructive/10"
                          onClick={() => handleReviewJudge(judge.id, "rejected")}
                        >
                          <XCircle className="size-4" />
                          Reddet
                        </Button>
                      </>
                    );

                    if (viewMode === "list") {
                      return (
                        <Card key={judge.id} className="py-0">
                          <CardContent className="flex flex-wrap items-center gap-4 px-5 py-4">
                            <Avatar>
                              <AvatarFallback>{judge.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-semibold">{judge.name}</p>
                              <p className="truncate text-sm text-muted-foreground">{judge.email}</p>
                            </div>
                            <span className="shrink-0 text-sm text-muted-foreground">
                              {judge.judgeWorkStatus ? WORK_STATUS_LABEL[judge.judgeWorkStatus] : "Belirtilmemiş"}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {expertise.map((c) => (
                                <Badge key={c.id} variant="secondary">
                                  {c.name}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex shrink-0 gap-2">{actions}</div>
                          </CardContent>
                        </Card>
                      );
                    }

                    return (
                      <Card key={judge.id}>
                        <CardContent className="space-y-4 pt-6">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{judge.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold">{judge.name}</p>
                              <p className="truncate text-sm text-muted-foreground">{judge.email}</p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <p className="text-sm text-muted-foreground">Çalışma Durumu</p>
                            <p className="text-base font-medium">
                              {judge.judgeWorkStatus ? WORK_STATUS_LABEL[judge.judgeWorkStatus] : "Belirtilmemiş"}
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <p className="text-sm text-muted-foreground">Uzmanlık Alanları</p>
                            <div className="flex flex-wrap gap-1.5">
                              {expertise.map((c) => (
                                <Badge key={c.id} variant="secondary">
                                  {c.name}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <Separator />

                          <div className="flex gap-2">{actions}</div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeSection === "contestants" && (
            <div className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="İsim, telefon veya e-posta ile ara..."
                  value={contestantSearch}
                  onChange={(e) => setContestantSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
              {filteredContestants.map((contestant) => {
                const contestantReports = reports.filter((r) => r.contestantId === contestant.id);

                if (viewMode === "list") {
                  return (
                    <Card
                      key={contestant.id}
                      className="cursor-pointer py-0 transition-colors hover:border-primary/40"
                      onClick={() => setSelectedContestantId(contestant.id)}
                    >
                      <CardContent className="flex items-center gap-4 px-5 py-4">
                        <Avatar>
                          <AvatarFallback>{contestant.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold">{contestant.name}</p>
                          <p className="truncate text-sm text-muted-foreground">{contestant.email}</p>
                        </div>
                        <span className="shrink-0 text-sm text-muted-foreground">
                          {contestantReports.length} rapor
                        </span>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <Card
                    key={contestant.id}
                    className="cursor-pointer transition-colors hover:border-primary/40"
                    onClick={() => setSelectedContestantId(contestant.id)}
                  >
                    <CardContent className="space-y-4 pt-6">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{contestant.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold">{contestant.name}</p>
                          <p className="truncate text-sm text-muted-foreground">{contestant.email}</p>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between text-base">
                        <span className="text-muted-foreground">Gönderilen Rapor</span>
                        <span className="font-semibold">{contestantReports.length}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              </div>
            </div>
          )}

          {activeSection === "competitions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-base text-muted-foreground">
                  {categories.length} yarışma listeleniyor
                </p>
                <Button
                  onClick={() => setCreateCompetitionOpen(true)}
                  className="gap-1.5 transition-transform active:scale-[0.97]"
                >
                  <Plus className="size-4" />
                  Yeni Yarışma
                </Button>
              </div>

              <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
                {categories.map((c) => {
                  const reportCount = reports.filter((r) => r.categoryId === c.id).length;
                  const docBadges = (
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={c.specification ? "secondary" : "outline"} className="gap-1">
                        <FileText className="size-3" />
                        {c.specification ? "Şartname Yüklü" : "Şartname Yok"}
                      </Badge>
                      <Badge variant={c.reportTemplate ? "secondary" : "outline"} className="gap-1">
                        <FileText className="size-3" />
                        {c.reportTemplate ? "Şablon Yüklü" : "Şablon Yok"}
                      </Badge>
                    </div>
                  );

                  if (viewMode === "list") {
                    return (
                      <Card
                        key={c.id}
                        className="cursor-pointer py-0 transition-colors hover:border-primary/40"
                        onClick={() => setEditCompetitionId(c.id)}
                      >
                        <CardContent className="flex flex-wrap items-center gap-4 px-5 py-4">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Trophy className="size-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold">{c.name}</p>
                            <p className="text-sm text-muted-foreground">{reportCount} rapor</p>
                          </div>
                          {docBadges}
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <Card
                      key={c.id}
                      className="cursor-pointer transition-colors hover:border-primary/40"
                      onClick={() => setEditCompetitionId(c.id)}
                    >
                      <CardContent className="space-y-3 pt-6">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Trophy className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold">{c.name}</p>
                            <p className="text-sm text-muted-foreground">{reportCount} rapor</p>
                          </div>
                        </div>
                        {c.description && (
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {c.description}
                          </p>
                        )}
                        {docBadges}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === "criteria" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-base text-muted-foreground">
                  {scoreCriteria.length} kriter &middot; toplam {maxTotalScore} puan
                </p>
                <Button onClick={openCreateCriterion} className="gap-1.5 transition-transform active:scale-[0.97]">
                  <Plus className="size-4" />
                  Yeni Kriter
                </Button>
              </div>

              {scoreCriteria.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-base text-muted-foreground">
                  Henüz tanımlı bir değerlendirme kriteri yok.
                </p>
              ) : (
                <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
                  {scoreCriteria.map((criterion) => {
                    const actions = (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1.5"
                          onClick={() => openEditCriterion(criterion.id)}
                        >
                          <Pencil className="size-3.5" />
                          Düzenle
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={deletingCriterionId === criterion.id}
                          className="flex-1 gap-1.5 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteCriterion(criterion.id)}
                        >
                          {deletingCriterionId === criterion.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                          Sil
                        </Button>
                      </>
                    );

                    if (viewMode === "list") {
                      return (
                        <Card key={criterion.id} className="py-0">
                          <CardContent className="flex flex-wrap items-center gap-4 px-5 py-4">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-semibold">{criterion.label}</p>
                              {criterion.description && (
                                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                                  {criterion.description}
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary" className="shrink-0">
                              {criterion.maxScore} puan
                            </Badge>
                            <div className="flex shrink-0 gap-2">{actions}</div>
                          </CardContent>
                        </Card>
                      );
                    }

                    return (
                      <Card key={criterion.id}>
                        <CardContent className="space-y-3 pt-6">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold">{criterion.label}</p>
                              {criterion.description && (
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                  {criterion.description}
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary" className="shrink-0">
                              {criterion.maxScore} puan
                            </Badge>
                          </div>
                          <Separator />
                          <div className="flex gap-2">{actions}</div>
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
            <SheetTitle>Yönetim Menüsü</SheetTitle>
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

      <Dialog open={!!pendingAssignment} onOpenChange={(o) => !o && setPendingAssignment(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Atamayı onaylıyor musunuz?</DialogTitle>
            <DialogDescription>
              {pendingAssignment?.label},{" "}
              {judges.find((j) => j.id === pendingAssignment?.judgeId)?.name ?? "seçilen hakeme"}{" "}
              atanacak.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" disabled={assigning} onClick={() => setPendingAssignment(null)}>
              Vazgeç
            </Button>
            <Button
              onClick={confirmAssign}
              disabled={assigning}
              className="gap-1.5 transition-transform active:scale-[0.98]"
            >
              {assigning && <Loader2 className="size-4 animate-spin" />}
              {assigning ? "Atanıyor..." : "Onayla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selectedJudgeId} onOpenChange={(o) => !o && setSelectedJudgeId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selectedJudge && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedJudge.name}</SheetTitle>
                <SheetDescription>
                  {selectedJudge.email} &middot; {selectedJudge.phone}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-4 pb-6">
                <div>
                  <p className="mb-1.5 text-sm font-medium text-muted-foreground">
                    Uzmanlık Alanları
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {categories
                      .filter((c) => selectedJudge.categoryIds.includes(c.id))
                      .map((c) => (
                        <Badge key={c.id} variant="secondary">
                          {c.name}
                        </Badge>
                      ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="mb-2 text-base font-semibold">
                    Atanan Raporlar ({selectedJudgeReports.length})
                  </p>
                  {selectedJudgeReports.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Henüz atanmış rapor yok.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedJudgeReports.map((r) => (
                        <div key={r.id} className="rounded-lg border border-border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-base font-medium">{r.title}</p>
                            <Badge variant="outline" className={STATUS_BADGE_CLASS[r.status]}>
                              {STATUS_LABEL[r.status]}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground">{r.contestantName}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <p className="mb-2 text-base font-semibold">Tamamlanan Değerlendirmeler</p>
                  {selectedJudgeCompletedEvaluations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Henüz tamamlanmış bir değerlendirme yok.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedJudgeCompletedEvaluations.map(({ report, evaluation }) => (
                        <div key={report.id} className="space-y-2 rounded-lg border border-border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-base font-medium">{report.title}</p>
                            <span className="shrink-0 text-base font-bold text-primary">
                              {evaluation.totalScore} / {maxTotalScore}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {scoreCriteria.map((criterion) => {
                              const cs = evaluation.criteriaScores.find(
                                (x) => x.criterionId === criterion.id,
                              );
                              return (
                                <div
                                  key={criterion.id}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-muted-foreground">{criterion.label}</span>
                                  <span>
                                    {cs?.score ?? 0} / {criterion.maxScore}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          {evaluation.overallComment && (
                            <p className="border-t border-border pt-2 text-sm text-muted-foreground italic">
                              “{evaluation.overallComment}”
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet
        open={!!selectedContestantId}
        onOpenChange={(o) => !o && setSelectedContestantId(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selectedContestant && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedContestant.name}</SheetTitle>
                <SheetDescription>
                  {selectedContestant.email} &middot; {selectedContestant.phone}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-4 pb-6">
                {(selectedContestant.school || selectedContestant.department) && (
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-muted-foreground">
                      Eğitim Bilgileri
                    </p>
                    <div className="space-y-1 text-base">
                      {selectedContestant.school && <p>{selectedContestant.school}</p>}
                      {selectedContestant.department && (
                        <p className="text-muted-foreground">
                          {selectedContestant.department}
                          {selectedContestant.grade ? ` · ${selectedContestant.grade}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <p className="mb-2 text-base font-semibold">
                    Gönderilen Raporlar ({selectedContestantReports.length})
                  </p>
                  {selectedContestantReports.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Henüz rapor göndermemiş.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedContestantReports.map((r) => {
                        const evaluation = evaluations.find((e) => e.reportId === r.id);
                        const category = categories.find((c) => c.id === r.categoryId);
                        return (
                          <div key={r.id} className="rounded-lg border border-border p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-base font-medium">{r.title}</p>
                              <Badge variant="outline" className={STATUS_BADGE_CLASS[r.status]}>
                                {STATUS_LABEL[r.status]}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {category?.name ?? "Kategori"} &middot; {formatDate(r.submittedAt)}
                            </p>
                            {evaluation && (
                              <p className="mt-1 text-sm font-medium text-primary">
                                Puan: {evaluation.totalScore} / {maxTotalScore}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={createCompetitionOpen} onOpenChange={setCreateCompetitionOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Yeni Yarışma Oluştur</DialogTitle>
            <DialogDescription>
              Adını gir, ardından açılacak panelden şartname ve rapor şablonunu yükleyebilirsin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCompetition} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-comp-name">Yarışma Adı</Label>
              <Input
                id="new-comp-name"
                required
                value={newCompetitionName}
                onChange={(e) => setNewCompetitionName(e.target.value)}
                placeholder="Örn: Roket Yarışması"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-comp-desc">Açıklama (opsiyonel)</Label>
              <Textarea
                id="new-comp-desc"
                rows={2}
                value={newCompetitionDescription}
                onChange={(e) => setNewCompetitionDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={creatingCompetition}
                className="w-full gap-1.5 transition-transform active:scale-[0.98]"
              >
                {creatingCompetition && <Loader2 className="size-4 animate-spin" />}
                {creatingCompetition ? "Oluşturuluyor..." : "Oluştur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={!!editCompetitionId} onOpenChange={(o) => !o && setEditCompetitionId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {editingCompetition && (
            <CompetitionEditSheet key={editingCompetition.id} competition={editingCompetition} />
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={criterionDialogOpen} onOpenChange={setCriterionDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCriterionId ? "Kriteri Düzenle" : "Yeni Kriter Ekle"}</DialogTitle>
            <DialogDescription>
              Hakemlerin rapor değerlendirirken puanladığı kriteri tanımla.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCriterion} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="criterion-label">Kriter Adı</Label>
              <Input
                id="criterion-label"
                required
                value={criterionLabel}
                onChange={(e) => setCriterionLabel(e.target.value)}
                placeholder="Örn: İçerik ve Özgünlük"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="criterion-max-score">Maksimum Puan</Label>
              <Input
                id="criterion-max-score"
                type="number"
                min={1}
                max={100}
                required
                value={criterionMaxScore}
                onChange={(e) => setCriterionMaxScore(e.target.value)}
                placeholder="Örn: 30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="criterion-desc">Açıklama (opsiyonel)</Label>
              <Textarea
                id="criterion-desc"
                rows={2}
                value={criterionDescription}
                onChange={(e) => setCriterionDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={savingCriterion}
                className="w-full gap-1.5 transition-transform active:scale-[0.98]"
              >
                {savingCriterion && <Loader2 className="size-4 animate-spin" />}
                {editingCriterionId ? "Kaydet" : "Ekle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
