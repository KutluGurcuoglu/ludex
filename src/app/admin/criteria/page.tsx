"use client";

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/useAppStore";
import * as evaluationsService from "@/services/evaluations.service";
import { useViewMode } from "../_lib/shared";

export default function AdminCriteriaPage() {
  const scoreCriteria = useAppStore((s) => s.scoreCriteria);
  const { viewMode } = useViewMode();

  const maxTotalScore = useMemo(
    () => scoreCriteria.reduce((sum, c) => sum + c.maxScore, 0),
    [scoreCriteria],
  );

  const [criterionDialogOpen, setCriterionDialogOpen] = useState(false);
  const [editingCriterionId, setEditingCriterionId] = useState<string | null>(null);
  const [criterionLabel, setCriterionLabel] = useState("");
  const [criterionMaxScore, setCriterionMaxScore] = useState("");
  const [criterionDescription, setCriterionDescription] = useState("");
  const [savingCriterion, setSavingCriterion] = useState(false);
  const [deletingCriterionId, setDeletingCriterionId] = useState<string | null>(null);

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

  return (
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
                        <p className="mt-0.5 text-sm text-muted-foreground">{criterion.description}</p>
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
    </div>
  );
}
