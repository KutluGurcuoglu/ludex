"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, FileText, Loader2, Save, Sparkles, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAppStore } from "@/store/useAppStore";
import * as judgesService from "@/services/judges.service";
import { refreshJudges } from "@/services/sync";
import { WORK_STATUS_LABEL, useViewMode } from "../_lib/shared";

export default function AdminJudgeApplicationsPage() {
  const categories = useAppStore((s) => s.categories);
  const judges = useAppStore((s) => s.judges);
  const { viewMode } = useViewMode();
  const [selectedJudgeId, setSelectedJudgeId] = useState<string | null>(null);

  const pendingJudgeApplications = useMemo(
    () => judges.filter((j) => (j.judgeApprovalStatus ?? "pending") === "pending"),
    [judges],
  );

  const [autoApprovingJudges, setAutoApprovingJudges] = useState(false);
  const selectedJudge = pendingJudgeApplications.find((j) => j.id === selectedJudgeId) ?? null;

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [savingCategories, setSavingCategories] = useState(false);

  useEffect(() => {
    setSelectedCategoryIds(selectedJudge?.categoryIds ?? []);
  }, [selectedJudge]);

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    );
  }

  async function handleSaveCategories() {
    if (!selectedJudge) return;
    setSavingCategories(true);
    try {
      await judgesService.setJudgeCategories(selectedJudge.id, selectedCategoryIds);
      await refreshJudges();
      toast.success("Uzmanlık alanları güncellendi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kategoriler kaydedilemedi.");
    } finally {
      setSavingCategories(false);
    }
  }

  async function handleReviewJudge(userId: string, decision: "approved" | "rejected") {
    const judge = judges.find((j) => j.id === userId);
    try {
      await judgesService.reviewJudgeApplication(userId, decision);
      await refreshJudges();
      toast.success(
        decision === "approved"
          ? `${judge?.name ?? "Hakem"} onaylandı.`
          : `${judge?.name ?? "Hakem"} başvurusu reddedildi.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Karar kaydedilemedi.");
    }
  }

  async function handleAutoApproveJudges() {
    if (pendingJudgeApplications.length === 0) {
      toast.info("Bekleyen hakem başvurusu yok.");
      return;
    }
    setAutoApprovingJudges(true);
    try {
      await Promise.all(
        pendingJudgeApplications.map((j) => judgesService.reviewJudgeApplication(j.id, "approved")),
      );
      await refreshJudges();
      toast.success(`${pendingJudgeApplications.length} hakem başvurusu otomatik onaylandı.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Otomatik onay başarısız oldu.");
    } finally {
      setAutoApprovingJudges(false);
    }
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
                    <div className="flex shrink-0 gap-2" onClick={(e) => e.stopPropagation()}>
                      {actions}
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

                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {actions}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">Unvan / Pozisyon</p>
                    <p className="text-base">{selectedJudge.jobTitle || "Belirtilmemiş"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">Kurum</p>
                    <p className="text-base">{selectedJudge.department || "Belirtilmemiş"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">Çalışma Durumu</p>
                    <p className="text-base">
                      {selectedJudge.judgeWorkStatus
                        ? WORK_STATUS_LABEL[selectedJudge.judgeWorkStatus]
                        : "Belirtilmemiş"}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">Uzmanlık Dalı</p>
                    <p className="text-base">{selectedJudge.expertiseArea || "Belirtilmemiş"}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Uzmanlık Alanları</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 px-2 text-xs"
                      disabled={savingCategories}
                      onClick={handleSaveCategories}
                    >
                      {savingCategories ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Save className="size-3" />
                      )}
                      Kaydet
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((c) => {
                      const active = selectedCategoryIds.includes(c.id);
                      return (
                        <Badge
                          key={c.id}
                          variant={active ? "default" : "outline"}
                          className="cursor-pointer select-none"
                          onClick={() => toggleCategory(c.id)}
                        >
                          {c.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {selectedJudge.customExpertiseTags && selectedJudge.customExpertiseTags.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-muted-foreground">
                      Ek Uzmanlık Etiketleri
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedJudge.customExpertiseTags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">
                      Akademik Profil / Özgeçmiş Linki
                    </p>
                    {selectedJudge.academicProfileUrl ? (
                      <a
                        href={selectedJudge.academicProfileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-base text-primary hover:underline"
                      >
                        {selectedJudge.academicProfileUrl}
                        <ExternalLink className="size-3.5" />
                      </a>
                    ) : (
                      <p className="text-base text-muted-foreground">Belirtilmemiş</p>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">CV Dosyası</p>
                    {selectedJudge.cvFileName ? (
                      <p className="inline-flex items-center gap-1.5 text-base">
                        <FileText className="size-4 text-muted-foreground" />
                        {selectedJudge.cvFileName}
                      </p>
                    ) : (
                      <p className="text-base text-muted-foreground">Yüklenmemiş</p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-1.5"
                    onClick={() => {
                      handleReviewJudge(selectedJudge.id, "approved");
                      setSelectedJudgeId(null);
                    }}
                  >
                    <CheckCircle2 className="size-4" />
                    Onayla
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      handleReviewJudge(selectedJudge.id, "rejected");
                      setSelectedJudgeId(null);
                    }}
                  >
                    <XCircle className="size-4" />
                    Reddet
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
