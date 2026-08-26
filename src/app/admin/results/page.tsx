"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/store/useAppStore";
import * as evaluationsService from "@/services/evaluations.service";
import { refreshEvaluations } from "@/services/sync";
import { formatDate } from "../_lib/shared";

export default function AdminResultsPage() {
  const evaluations = useAppStore((s) => s.evaluations);
  const reports = useAppStore((s) => s.reports);
  const categories = useAppStore((s) => s.categories);
  const judges = useAppStore((s) => s.judges);
  const contestants = useAppStore((s) => s.contestants);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const pending = useMemo(
    () => evaluations
      .filter((evaluation) => evaluation.status === "submitted" && !evaluation.visibleToContestant)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [evaluations],
  );

  async function approve(id: string) {
    setApprovingId(id);
    try {
      await evaluationsService.approveEvaluation(id);
      await refreshEvaluations();
      toast.success("Değerlendirme yayınlandı.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Değerlendirme yayınlanamadı.");
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Yayın öncesi kontrol</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Sonuç Onayları</h1>
        <p className="mt-1 text-muted-foreground">Gönderilmiş değerlendirmeleri yarışmacılara açmadan önce incele.</p>
      </div>

      {pending.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-muted-foreground">
          Yayın bekleyen değerlendirme bulunmuyor.
        </p>
      ) : (
        <div className="space-y-3">
          {pending.map((evaluation) => {
            const report = reports.find((item) => item.id === evaluation.reportId);
            const category = categories.find((item) => item.id === report?.categoryId);
            const contestant = contestants.find((item) => item.id === report?.contestantId);
            const judge = judges.find((item) => item.id === evaluation.judgeId);
            const isApproving = approvingId === evaluation.id;
            return (
              <Card key={evaluation.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{report?.title ?? "Rapor"}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {contestant?.name ?? "Yarışmacı bilinmiyor"} · {category?.name ?? "Kategori bilinmiyor"}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 gap-1 border-amber-200 bg-amber-50 text-amber-700">
                    <Clock className="size-3" /> Yayın bekliyor
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 text-sm sm:grid-cols-4">
                    <div><p className="text-muted-foreground">Hakem</p><p className="font-medium">{judge?.name ?? "Bilinmiyor"}</p></div>
                    <div><p className="text-muted-foreground">Toplam puan</p><p className="font-medium">{evaluation.totalScore}</p></div>
                    <div><p className="text-muted-foreground">Güncellendi</p><p className="font-medium">{formatDate(evaluation.updatedAt)}</p></div>
                    <div><p className="text-muted-foreground">Durum</p><p className="font-medium">Gönderildi · Onaylanmadı</p></div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="mb-1 font-medium">Genel yorum</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">{evaluation.overallComment || "Yorum yok."}</p>
                  </div>
                  <Button disabled={isApproving} onClick={() => approve(evaluation.id)} className="gap-1.5">
                    {isApproving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    {isApproving ? "Yayınlanıyor..." : "Onayla ve Yayınla"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
