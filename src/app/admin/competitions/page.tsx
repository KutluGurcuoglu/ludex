"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Plus, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
import { CompetitionEditSheet, useViewMode } from "../_lib/shared";

export default function AdminCompetitionsPage() {
  const categories = useAppStore((s) => s.categories);
  const reports = useAppStore((s) => s.reports);
  const { viewMode } = useViewMode();

  const [createCompetitionOpen, setCreateCompetitionOpen] = useState(false);
  const [creatingCompetition, setCreatingCompetition] = useState(false);
  const [newCompetitionName, setNewCompetitionName] = useState("");
  const [newCompetitionDescription, setNewCompetitionDescription] = useState("");
  const [editCompetitionId, setEditCompetitionId] = useState<string | null>(null);

  const editingCompetition = categories.find((c) => c.id === editCompetitionId) ?? null;

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-base text-muted-foreground">{categories.length} yarışma listeleniyor</p>
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
                  <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                )}
                {docBadges}
              </CardContent>
            </Card>
          );
        })}
      </div>

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
    </div>
  );
}
