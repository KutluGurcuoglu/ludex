"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAppStore } from "@/store/useAppStore";
import { APPROVAL_STATUS_BADGE_CLASS, APPROVAL_STATUS_LABEL, STATUS_BADGE_CLASS, STATUS_LABEL, useViewMode } from "../_lib/shared";

export default function AdminJudgesPage() {
  const categories = useAppStore((s) => s.categories);
  const users = useAppStore((s) => s.users);
  const reports = useAppStore((s) => s.reports);
  const evaluations = useAppStore((s) => s.evaluations);
  const scoreCriteria = useAppStore((s) => s.scoreCriteria);
  const { viewMode } = useViewMode();

  const judges = useMemo(() => users.filter((u) => u.role === "judge"), [users]);
  const [judgeSearch, setJudgeSearch] = useState("");
  const [selectedJudgeId, setSelectedJudgeId] = useState<string | null>(null);

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

  const maxTotalScore = useMemo(
    () => scoreCriteria.reduce((sum, c) => sum + c.maxScore, 0),
    [scoreCriteria],
  );

  const selectedJudge = judges.find((j) => j.id === selectedJudgeId) ?? null;
  const selectedJudgeReports = selectedJudge
    ? reports.filter((r) => r.assignedJudgeId === selectedJudge.id)
    : [];
  const selectedJudgeCompletedEvaluations = selectedJudge
    ? selectedJudgeReports
        .filter((r) => r.status === "completed")
        .flatMap((r) => {
          const evaluation = evaluations.find((e) => e.reportId === r.id);
          return evaluation ? [{ report: r, evaluation }] : [];
        })
    : [];

  return (
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
                  <p className="mb-1.5 text-sm font-medium text-muted-foreground">Uzmanlık Alanları</p>
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
                    <p className="text-sm text-muted-foreground">Henüz tamamlanmış bir değerlendirme yok.</p>
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
                                <div key={criterion.id} className="flex items-center justify-between text-sm">
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
    </div>
  );
}
