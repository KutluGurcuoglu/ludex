"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/store/useAppStore";
import * as evaluationsService from "@/services/evaluations.service";
import { useViewMode } from "../_lib/shared";

export default function AdminDisqualificationsPage() {
  const users = useAppStore((s) => s.users);
  const reports = useAppStore((s) => s.reports);
  const evaluations = useAppStore((s) => s.evaluations);
  const { viewMode } = useViewMode();

  const [resolvingReportId, setResolvingReportId] = useState<string | null>(null);

  const disqualificationRequests = useMemo(
    () =>
      evaluations.filter((e) => e.disqualificationRecommendation).flatMap((evaluation) => {
        const report = reports.find((r) => r.id === evaluation.reportId);
        if (!report) return [];
        const judge = users.find((u) => u.id === evaluation.judgeId) ?? null;
        return [{ evaluation, report, judge }];
      }),
    [evaluations, reports, users],
  );
  const pendingDisqualifications = useMemo(
    () =>
      disqualificationRequests.filter(
        (x) => !x.evaluation.disqualificationRecommendation?.adminDecision,
      ),
    [disqualificationRequests],
  );
  const resolvedDisqualifications = useMemo(
    () =>
      disqualificationRequests.filter((x) =>
        x.evaluation.disqualificationRecommendation?.adminDecision,
      ),
    [disqualificationRequests],
  );

  async function handleResolveDisqualification(reportId: string, decision: "upheld" | "dismissed") {
    setResolvingReportId(reportId);
    await evaluationsService.resolveDisqualification(reportId, decision);
    setResolvingReportId(null);
    toast.success(
      decision === "upheld" ? "Rapor elendi olarak işaretlendi." : "Elenme önerisi reddedildi.",
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-base text-muted-foreground">
          {pendingDisqualifications.length} bekleyen elenme önerisi
        </p>
      </div>

      {pendingDisqualifications.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-base text-muted-foreground">
          Bekleyen elenme önerisi yok.
        </p>
      ) : (
        <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
          {pendingDisqualifications.map(({ evaluation, report, judge }) => {
            const recommendation = evaluation.disqualificationRecommendation!;
            const isResolving = resolvingReportId === report.id;
            return (
              <Card key={report.id} className="border-red-300 dark:border-red-900">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{report.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {report.contestantName} &middot; Hakem: {judge?.name ?? "Bilinmeyen"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                    >
                      Elenme Önerisi
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Şartname kuralı</p>
                    <p className="text-base">{recommendation.ruleText}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Hakemin bulgusu</p>
                    <p className="text-base">{recommendation.findingText}</p>
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isResolving}
                      className="flex-1 gap-1.5"
                      onClick={() => handleResolveDisqualification(report.id, "upheld")}
                    >
                      {isResolving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ThumbsDown className="size-4" />
                      )}
                      Elemeyi Onayla
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isResolving}
                      className="flex-1 gap-1.5"
                      onClick={() => handleResolveDisqualification(report.id, "dismissed")}
                    >
                      <ThumbsUp className="size-4" />
                      Reddet
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {resolvedDisqualifications.length > 0 && (
        <div className="space-y-3">
          <p className="text-base font-semibold">
            Karara Bağlanmış Öneriler ({resolvedDisqualifications.length})
          </p>
          <div className="space-y-2">
            {resolvedDisqualifications.map(({ evaluation, report, judge }) => {
              const recommendation = evaluation.disqualificationRecommendation!;
              return (
                <Card key={report.id} className="py-0">
                  <CardContent className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium">{report.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {report.contestantName} &middot; Hakem: {judge?.name ?? "Bilinmeyen"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        recommendation.adminDecision === "upheld"
                          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                      }
                    >
                      {recommendation.adminDecision === "upheld" ? "Elendi" : "Reddedildi"}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
