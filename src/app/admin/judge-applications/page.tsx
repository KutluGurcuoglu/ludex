"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppStore } from "@/store/useAppStore";
import * as usersService from "@/services/users.service";
import { WORK_STATUS_LABEL, useViewMode } from "../_lib/shared";

export default function AdminJudgeApplicationsPage() {
  const categories = useAppStore((s) => s.categories);
  const users = useAppStore((s) => s.users);
  const { viewMode } = useViewMode();

  const judges = useMemo(() => users.filter((u) => u.role === "judge"), [users]);
  const pendingJudgeApplications = useMemo(
    () =>
      judges.filter(
        (j) => (j.judgeApprovalStatus ?? "pending") === "pending" && j.categoryIds.length > 0,
      ),
    [judges],
  );

  const [autoApprovingJudges, setAutoApprovingJudges] = useState(false);

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

  return (
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

                  <div className="flex gap-2">{actions}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
