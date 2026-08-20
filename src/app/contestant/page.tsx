"use client";

import { useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, FileText, Send, UploadCloud, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore, useCurrentUser } from "@/store/useAppStore";
import type { ReportStatus } from "@/types";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending_assignment: "Gönderildi",
  assigned: "Gönderildi",
  in_review: "Değerlendirmede",
  completed: "Tamamlandı",
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
};

const STATUS_ICON: Record<ReportStatus, typeof Clock> = {
  pending_assignment: Send,
  assigned: Send,
  in_review: Clock,
  completed: CheckCircle2,
};

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
  const addReport = useAppStore((s) => s.addReport);

  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const myReports = useMemo(
    () =>
      user
        ? reports
            .filter((r) => r.contestantId === user.id)
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        : [],
    [reports, user],
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !categoryId || !title.trim() || !file) return;

    addReport({
      contestantId: user.id,
      categoryId,
      title: title.trim(),
      fileName: file.name,
      fileSizeBytes: file.size,
      pdfUrl: "/mock-pdfs/sample-report.pdf",
    });

    toast.success("Raporun başarıyla gönderildi.", {
      description: "Admin tarafından bir hakeme atandığında durumunu buradan takip edebilirsin.",
    });

    setCategoryId("");
    setTitle("");
    setFile(null);
    setFileError(null);
  }

  const canSubmit = Boolean(categoryId && title.trim() && file);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Yarışmacı Paneli</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Kategori seçip raporunu PDF olarak yükle, değerlendirme sürecini buradan takip et.
          </p>
        </div>

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
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                      isDragging
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <UploadCloud className="size-8 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Dosyayı sürükle bırak veya <span className="text-primary">gözat</span>
                    </p>
                    <p className="text-xs text-muted-foreground">PDF, maksimum 20 MB</p>
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
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
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

                {fileError && <p className="text-xs font-medium text-destructive">{fileError}</p>}
              </div>

              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full gap-2 transition-transform active:scale-[0.98] sm:w-auto"
              >
                <Send className="size-4" />
                Raporu Gönder
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">Raporlarım</h2>

          {myReports.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Henüz gönderilmiş bir raporun yok.
            </p>
          ) : (
            <div className="space-y-2">
              {myReports.map((report) => {
                const Icon = STATUS_ICON[report.status];
                const category = categories.find((c) => c.id === report.categoryId);
                return (
                  <Card key={report.id} className="py-0">
                    <CardContent className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{report.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {category?.name ?? "Kategori"} &middot; {formatFileSize(report.fileSizeBytes)}{" "}
                          &middot; {formatDate(report.submittedAt)}
                        </p>
                      </div>
                      <Badge variant="outline" className={`gap-1 ${STATUS_BADGE_CLASS[report.status]}`}>
                        <Icon className="size-3" />
                        {STATUS_LABEL[report.status]}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
