"use client";

import { createContext, useContext, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertOctagon,
  FileText,
  Gavel,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  Trophy,
  UploadCloud,
  UserCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/useAppStore";
import * as categoriesService from "@/services/categories.service";
import { refreshCategories, refreshEvaluations } from "@/services/sync";
import type { Category, JudgeApprovalStatus, JudgeWorkStatus, ReportStatus, ScoreCriterion } from "@/types";

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const WORK_STATUS_LABEL: Record<JudgeWorkStatus, string> = {
  working: "Çalışıyor",
  studying: "Öğrenci",
  both: "Çalışıyor + Öğrenci",
};

export const APPROVAL_STATUS_BADGE_CLASS: Record<JudgeApprovalStatus, string> = {
  pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  approved:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  rejected:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

export const APPROVAL_STATUS_LABEL: Record<JudgeApprovalStatus, string> = {
  pending: "Onay Bekliyor",
  approved: "Onaylı",
  rejected: "Reddedildi",
};

export const STATUS_LABEL: Record<ReportStatus, string> = {
  pending_assignment: "Atama Bekliyor",
  assigned: "Atandı",
  in_review: "Değerlendirmede",
  completed: "Tamamlandı",
  disqualified: "Elendi",
};

export const STATUS_BADGE_CLASS: Record<ReportStatus, string> = {
  pending_assignment:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  assigned:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  in_review:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300",
  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  disqualified:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

export const NAV_ITEMS = [
  { href: "/admin", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/admin/pool", label: "Rapor Havuzu", icon: FileText },
  { href: "/admin/judges", label: "Hakemler", icon: Gavel },
  { href: "/admin/judge-applications", label: "Hakem Başvuruları", icon: UserCheck },
  { href: "/admin/disqualifications", label: "Elenme Önerileri", icon: AlertOctagon },
  { href: "/admin/contestants", label: "Yarışmacılar", icon: Users },
  { href: "/admin/competitions", label: "Yarışmalar", icon: Trophy },
  { href: "/admin/criteria", label: "Değerlendirme Kriterleri", icon: ListChecks },
  { href: "/admin/support", label: "Destek Talepleri", icon: LifeBuoy },
  { href: "/admin/announcements", label: "Duyuru Gönder", icon: Megaphone },
] as const;

/** Bu sayfalarda kutu/liste görünüm anahtarı gösterilmez (filtrelenecek bir liste değiller). */
export const VIEW_TOGGLE_HIDDEN_PATHS = new Set([
  "/admin",
  "/admin/pool",
  "/admin/announcements",
]);

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export type Accent = "primary" | "amber" | "violet" | "emerald";

export const ACCENT_CLASS: Record<Accent, string> = {
  primary: "bg-primary/10 text-primary",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export function StatCard({
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

export function AdminSkeleton() {
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

export function DocumentDropzone({
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
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all duration-200 active:scale-[0.98]",
          isDragging ? "scale-[1.01] border-primary bg-primary/5" : "border-border hover:border-primary/50",
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

/**
 * Bir kategorideki, hakemlerin bitirdiği ama admin'in henüz yayınlamadığı değerlendirmeleri
 * gösterir. Admin ister tek seferde "Şimdi Yayınla" der, ister bir tarih planlar — o tarih
 * geçtiğinde ResultsReleaseWatcher otomatik olarak yayınlar.
 */
function ResultsReleaseSection({ category }: { category: Category }) {
  const reports = useAppStore((s) => s.reports);
  const evaluations = useAppStore((s) => s.evaluations);
  const [releaseAt, setReleaseAt] = useState(
    category.resultsReleaseAt ? toLocalInputValue(category.resultsReleaseAt) : "",
  );
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [releasingNow, setReleasingNow] = useState(false);

  const reportIdsInCategory = new Set(
    reports.filter((r) => r.categoryId === category.id).map((r) => r.id),
  );
  const pendingCount = evaluations.filter(
    (e) => reportIdsInCategory.has(e.reportId) && e.status === "submitted" && !e.visibleToContestant,
  ).length;

  async function handleSchedule(e: FormEvent) {
    e.preventDefault();
    setSavingSchedule(true);
    try {
      await categoriesService.setCategoryReleaseDate(
        category.id,
        releaseAt ? new Date(releaseAt).toISOString() : null,
      );
      await refreshCategories();
      toast.success(releaseAt ? "Yayın tarihi planlandı." : "Planlanan yayın tarihi kaldırıldı.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Planlanamadı.");
    } finally {
      setSavingSchedule(false);
    }
  }

  async function handleReleaseNow() {
    setReleasingNow(true);
    try {
      await categoriesService.releaseCategoryResults(category.id);
      await Promise.all([refreshCategories(), refreshEvaluations()]);
      toast.success("Bu kategorideki onay bekleyen sonuçlar yayınlandı.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Yayınlanamadı.");
    } finally {
      setReleasingNow(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Sonuç Yayını</Label>
        <Badge variant="outline">{pendingCount} onay bekliyor</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Hakem puanlamayı bitirdiğinde sonuç otomatik olarak yarışmacıya gitmez; ya hemen
        yayınlarsın ya da bir tarih planlarsın.
      </p>

      <form onSubmit={handleSchedule} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor={`release-at-${category.id}`} className="text-sm text-muted-foreground">
            Planlanan yayın tarihi (opsiyonel)
          </Label>
          <Input
            id={`release-at-${category.id}`}
            type="datetime-local"
            value={releaseAt}
            onChange={(e) => setReleaseAt(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={savingSchedule}>
          {savingSchedule && <Loader2 className="size-4 animate-spin" />}
          Planla
        </Button>
      </form>

      <Button
        type="button"
        size="sm"
        className="w-full gap-1.5"
        disabled={releasingNow || pendingCount === 0}
        onClick={handleReleaseNow}
      >
        {releasingNow ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {pendingCount === 0 ? "Yayınlanacak sonuç yok" : `Şimdi Yayınla (${pendingCount})`}
      </Button>

      {category.resultsReleasedAt && (
        <p className="text-sm text-muted-foreground">
          Son yayın: {new Date(category.resultsReleasedAt).toLocaleString("tr-TR")}
        </p>
      )}
    </div>
  );
}

/**
 * Admin, bu kategorideki hakemlerin atanmış raporları değerlendirmeyi bitirmesi gereken
 * son tarihi belirler. Hakem panelinde uyarı olarak gösterilir; zorunlu bir kilit değildir.
 */
function EvaluationDeadlineSection({ category }: { category: Category }) {
  const [deadline, setDeadline] = useState(
    category.evaluationDeadline ? toLocalInputValue(category.evaluationDeadline) : "",
  );
  const [saving, setSaving] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await categoriesService.setCategoryEvaluationDeadline(
        category.id,
        deadline ? new Date(deadline).toISOString() : null,
      );
      await refreshCategories();
      toast.success(deadline ? "Değerlendirme son tarihi belirlendi." : "Son tarih kaldırıldı.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <Label>Değerlendirme Son Tarihi</Label>
      <p className="text-sm text-muted-foreground">
        Hakemlerin bu kategorideki atanmış raporları bitirmesi gereken tarih. Panellerinde uyarı
        olarak gösterilir.
      </p>
      <form onSubmit={handleSave} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor={`eval-deadline-${category.id}`} className="text-sm text-muted-foreground">
            Son tarih (opsiyonel)
          </Label>
          <Input
            id={`eval-deadline-${category.id}`}
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Kaydet
        </Button>
      </form>
    </div>
  );
}

/**
 * Bir kategorinin değerlendirme kriterleri; admin burada elle ekler/düzenler/siler
 * (PostgreSQL'de Category.criteria alanında saklanır — getEffectiveCriteria()).
 * "AI ile Yeniden Oluştur" hâlâ mock'tur (şartname metninden kriter üretimi Problem 4'ün
 * 6 zorunlu AI maddesi dışında, bilinçli olarak gerçek backend'e bağlanmadı).
 * Kategorinin kendi kriteri yoksa bu bölüm gizlenir — hakemler global varsayılan kriterleri kullanır.
 */
function CriteriaSection({ category }: { category: Category }) {
  const criteria = category.criteria ?? [];
  const maxTotal = criteria.reduce((sum, c) => sum + c.maxScore, 0);

  const [regenerating, setRegenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleRegenerate() {
    setRegenerating(true);
    const next = await categoriesService.regenerateCategoryCriteria(category.id);
    setRegenerating(false);
    toast.success(`AI ${next.length} kriteri yeniden oluşturdu.`);
  }

  function openCreate() {
    setEditingId(null);
    setLabel("");
    setMaxScore("");
    setDescription("");
    setDialogOpen(true);
  }

  function openEdit(criterion: ScoreCriterion) {
    setEditingId(criterion.id);
    setLabel(criterion.label);
    setMaxScore(String(criterion.maxScore));
    setDescription(criterion.description ?? "");
    setDialogOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const score = Number(maxScore);
    if (!label.trim() || !Number.isFinite(score) || score <= 0) return;

    setSaving(true);
    try {
      if (editingId) {
        await categoriesService.updateCategoryCriterion(category.id, editingId, {
          label: label.trim(),
          maxScore: score,
          description: description.trim() || undefined,
        });
      } else {
        await categoriesService.addCategoryCriterion(category.id, {
          label: label.trim(),
          maxScore: score,
          description: description.trim() || undefined,
        });
      }
      await refreshCategories();
      toast.success(editingId ? "Kriter güncellendi." : "Yeni kriter eklendi.");
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(criterionId: string) {
    setDeletingId(criterionId);
    try {
      await categoriesService.deleteCategoryCriterion(category.id, criterionId);
      await refreshCategories();
      toast.success("Kriter silindi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Silinemedi.");
    } finally {
      setDeletingId(null);
    }
  }

  if (criteria.length === 0) {
    return (
      <div className="space-y-3">
        <Label>Değerlendirme Kriterleri</Label>
        <p className="text-sm text-muted-foreground">
          Bu kategorinin kendi kriteri yok, hakemler varsayılan kriterleri kullanıyor.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Değerlendirme Kriterleri</Label>
        <Badge variant="outline">toplam {maxTotal} puan</Badge>
      </div>

      <div className="space-y-2">
        {criteria.map((criterion) => (
          <div
            key={criterion.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{criterion.label}</p>
              {criterion.description && (
                <p className="truncate text-xs text-muted-foreground">{criterion.description}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Badge variant="secondary">{criterion.maxScore} puan</Badge>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(criterion)}>
                <Pencil className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-destructive hover:bg-destructive/10"
                disabled={deletingId === criterion.id}
                onClick={() => handleDelete(criterion.id)}
              >
                {deletingId === criterion.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={openCreate}>
          <Plus className="size-3.5" />
          Kriter Ekle
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={regenerating}
          className="flex-1 gap-1.5"
          onClick={handleRegenerate}
        >
          {regenerating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          AI ile Yeniden Oluştur
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? "Kriteri Düzenle" : "Yeni Kriter Ekle"}</DialogTitle>
            <DialogDescription>Bu kategoriye özel bir değerlendirme kriteri tanımla.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`cat-crit-label-${category.id}`}>Kriter Adı</Label>
              <Input
                id={`cat-crit-label-${category.id}`}
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Örn: Teknik Yeterlilik Formu (TYF) Uyumu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`cat-crit-score-${category.id}`}>Maksimum Puan</Label>
              <Input
                id={`cat-crit-score-${category.id}`}
                type="number"
                min={1}
                max={100}
                required
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                placeholder="Örn: 25"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`cat-crit-desc-${category.id}`}>Açıklama (opsiyonel)</Label>
              <Textarea
                id={`cat-crit-desc-${category.id}`}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={saving}
                className="w-full gap-1.5 transition-transform active:scale-[0.98]"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {editingId ? "Kaydet" : "Ekle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Yarışmacıların bu kategoriye rapor gönderebileceği tarih aralığı. Şartname yüklendiğinde
 * AI tarafından önerilir; admin burada değiştirebilir veya süreyi uzatabilir. İkisi de boşsa
 * gönderim her zaman açıktır (bkz. contestant panelindeki "Rapor Gönder" kapısı).
 */
function SubmissionWindowSection({ category }: { category: Category }) {
  const [opensAt, setOpensAt] = useState(
    category.submissionOpensAt ? toLocalInputValue(category.submissionOpensAt) : "",
  );
  const [closesAt, setClosesAt] = useState(
    category.submissionClosesAt ? toLocalInputValue(category.submissionClosesAt) : "",
  );
  const [saving, setSaving] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await categoriesService.setCategorySubmissionWindow(
        category.id,
        opensAt ? new Date(opensAt).toISOString() : null,
        closesAt ? new Date(closesAt).toISOString() : null,
      );
      await refreshCategories();
      toast.success("Gönderim takvimi güncellendi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Takvim güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <Label>Rapor Gönderim Takvimi</Label>
      <p className="text-sm text-muted-foreground">
        Yarışmacılar yalnızca bu aralıkta rapor gönderebilir. İkisi de boş bırakılırsa gönderim
        her zaman açık olur.
      </p>
      <form onSubmit={handleSave} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor={`sub-opens-${category.id}`} className="text-sm text-muted-foreground">
              Açılış
            </Label>
            <Input
              id={`sub-opens-${category.id}`}
              type="datetime-local"
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`sub-closes-${category.id}`} className="text-sm text-muted-foreground">
              Kapanış
            </Label>
            <Input
              id={`sub-closes-${category.id}`}
              type="datetime-local"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={saving} className="w-full gap-1.5">
          {saving && <Loader2 className="size-4 animate-spin" />}
          Takvimi Kaydet
        </Button>
      </form>
    </div>
  );
}

export function CompetitionEditSheet({ competition }: { competition: Category }) {
  const [name, setName] = useState(competition.name);
  const [description, setDescription] = useState(competition.description ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingSpec, setUploadingSpec] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await categoriesService.updateCategory(competition.id, {
        name: name.trim(),
        description: description.trim(),
      });
      await refreshCategories();
      toast.success("Yarışma bilgileri güncellendi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSpecFile(file: File) {
    setUploadingSpec(true);
    try {
      await categoriesService.uploadCategorySpecification(competition.id, file);
      await refreshCategories();
      toast.success("Şartname yüklendi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Şartname yüklenemedi.");
    } finally {
      setUploadingSpec(false);
    }
  }

  async function handleTemplateFile(file: File) {
    setUploadingTemplate(true);
    try {
      await categoriesService.uploadCategoryTemplate(competition.id, file);
      await refreshCategories();
      toast.success("Rapor şablonu yüklendi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rapor şablonu yüklenemedi.");
    } finally {
      setUploadingTemplate(false);
    }
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

        <Separator />

        <ResultsReleaseSection category={competition} />

        <Separator />

        <EvaluationDeadlineSection category={competition} />

        <Separator />

        <SubmissionWindowSection category={competition} />

        <Separator />

        <CriteriaSection category={competition} />
      </div>
    </>
  );
}

type ViewMode = "grid" | "list";
const ViewModeContext = createContext<{
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
} | null>(null);

/** Kutu/liste görünüm tercihi — layout'ta kontrol edilir, alt sayfalarda tüketilir. */
export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error("useViewMode must be used within ViewModeProvider");
  return ctx;
}
