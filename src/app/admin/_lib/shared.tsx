"use client";

import { createContext, useContext, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertOctagon,
  FileText,
  Gavel,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Save,
  Trophy,
  UploadCloud,
  UserCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import * as categoriesService from "@/services/categories.service";
import type { Category, JudgeApprovalStatus, JudgeWorkStatus, ReportStatus } from "@/types";

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
] as const;

/** Bu sayfalarda kutu/liste görünüm anahtarı gösterilmez (filtrelenecek bir liste değiller). */
export const VIEW_TOGGLE_HIDDEN_PATHS = new Set(["/admin", "/admin/pool"]);

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

export function CompetitionEditSheet({ competition }: { competition: Category }) {
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
