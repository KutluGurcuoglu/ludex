"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, Loader2, Plus, Search, Sparkles, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/useAppStore";
import * as reportsService from "@/services/reports.service";
import { ReportTimeline } from "@/components/report-timeline";
import { aggregateEvaluations } from "@/lib/scoring";
import type { ReportStatus } from "@/types";
import { formatDate, formatFileSize, STATUS_BADGE_CLASS, STATUS_LABEL } from "../_lib/shared";
import type { User } from "@/types";

/**
 * Hakem seçim menüsü — arama kutusu içerir. Radix Select'in "item-aligned" konumlandırması
 * (seçili değer boşken, ör. "+ hakem ekle" düğmesinde) hizalayacağı bir öğe bulamayınca
 * menüyü tetikleyiciden uzakta/ekranın başka bir köşesinde açabiliyordu; DropdownMenu her
 * zaman "popper" tarzı konumlandırma kullandığından bu sorunu doğrudan ortadan kaldırır.
 */
function JudgeSearchMenu({
  judges,
  categoryId,
  onSelect,
  trigger,
}: {
  judges: User[];
  categoryId?: string;
  onSelect: (judgeId: string) => void;
  trigger: React.ReactNode;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return judges;
    return judges.filter((j) => j.name.toLowerCase().includes(q));
  }, [judges, search]);

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setSearch("");
      }}
    >
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-0">
        <div className="sticky top-0 z-10 border-b border-border bg-popover p-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Hakem ara..."
              className="h-7 pl-7 text-sm"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              Hakem bulunamadı.
            </p>
          ) : (
            filtered.map((j) => (
              <DropdownMenuItem key={j.id} onSelect={() => onSelect(j.id)}>
                {j.name}
                {categoryId && j.categoryIds.includes(categoryId) ? " ✓ Kategori uzmanı" : ""}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AdminPoolPage() {
  const categories = useAppStore((s) => s.categories);
  const users = useAppStore((s) => s.users);
  const reports = useAppStore((s) => s.reports);
  const evaluations = useAppStore((s) => s.evaluations);

  const judges = useMemo(() => users.filter((u) => u.role === "judge"), [users]);
  const approvedJudges = useMemo(
    () => judges.filter((j) => j.judgeApprovalStatus === "approved"),
    [judges],
  );

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkJudgeId, setBulkJudgeId] = useState("");
  const [pendingAssignment, setPendingAssignment] = useState<{
    reportIds: string[];
    judgeId: string;
    label: string;
  } | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports
      .filter((r) => {
        if (categoryFilter !== "all" && r.categoryId !== categoryFilter) return false;
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (
          query &&
          !r.title.toLowerCase().includes(query) &&
          !r.contestantName.toLowerCase().includes(query)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [reports, categoryFilter, statusFilter, search]);

  const allSelected = filteredReports.length > 0 && selectedIds.length === filteredReports.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : filteredReports.map((r) => r.id));
  }

  function judgesForCategory(categoryId: string) {
    return [...approvedJudges].sort((a, b) => {
      const aMatch = a.categoryIds.includes(categoryId) ? 0 : 1;
      const bMatch = b.categoryIds.includes(categoryId) ? 0 : 1;
      return aMatch - bMatch;
    });
  }

  function requestAssign(reportIds: string[], judgeId: string, label: string) {
    if (!judgeId) return;
    setPendingAssignment({ reportIds, judgeId, label });
  }

  async function confirmAssign() {
    if (!pendingAssignment) return;
    setAssigning(true);
    await reportsService.assignReports(pendingAssignment.reportIds, pendingAssignment.judgeId);
    setAssigning(false);
    const judge = judges.find((j) => j.id === pendingAssignment.judgeId);
    toast.success(`${pendingAssignment.label} ${judge?.name ?? "hakeme"} atandı.`);
    setPendingAssignment(null);
    setSelectedIds([]);
    setBulkJudgeId("");
  }

  async function handleUnassign(reportId: string, judgeId: string) {
    await reportsService.unassignJudge(reportId, judgeId);
  }

  async function handleAutoAssign() {
    const pending = reports.filter((r) => r.status === "pending_assignment");
    if (pending.length === 0) {
      toast.info("Atama bekleyen rapor yok.");
      return;
    }
    if (approvedJudges.length === 0) {
      toast.error("Sistemde onaylı hakem yok.");
      return;
    }

    const loadMap = new Map<string, number>();
    approvedJudges.forEach((j) => {
      const active = reports.filter(
        (r) =>
          r.assignedJudgeIds.includes(j.id) &&
          (r.status === "assigned" || r.status === "in_review"),
      ).length;
      loadMap.set(j.id, active);
    });

    setAutoAssigning(true);
    const assignments: Promise<void>[] = [];
    pending.forEach((report) => {
      const candidates = approvedJudges.filter((j) => j.categoryIds.includes(report.categoryId));
      const pool = candidates.length > 0 ? candidates : approvedJudges;
      let chosen = pool[0];
      pool.forEach((j) => {
        if ((loadMap.get(j.id) ?? 0) < (loadMap.get(chosen.id) ?? 0)) chosen = j;
      });
      assignments.push(reportsService.assignReports([report.id], chosen.id));
      loadMap.set(chosen.id, (loadMap.get(chosen.id) ?? 0) + 1);
    });

    await Promise.all(assignments);
    setAutoAssigning(false);
    toast.success(`${assignments.length} rapor otomatik olarak atandı.`);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-6">
          <Input
            placeholder="Rapor veya yarışmacı ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Kategoriler</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              {(Object.keys(STATUS_LABEL) as ReportStatus[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {STATUS_LABEL[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            disabled={autoAssigning}
            className="ml-auto gap-1.5 transition-transform active:scale-[0.97]"
            onClick={handleAutoAssign}
          >
            {autoAssigning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {autoAssigning ? "Atanıyor..." : "Otomatik Ata"}
          </Button>
        </CardContent>
      </Card>

      {selectedIds.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            <span className="text-base font-medium">{selectedIds.length} rapor seçildi</span>
            <JudgeSearchMenu
              judges={approvedJudges}
              onSelect={setBulkJudgeId}
              trigger={
                <Button variant="outline" className="w-[220px] justify-between font-normal">
                  {judges.find((j) => j.id === bulkJudgeId)?.name ?? "Hakem seç"}
                  <ChevronDown className="size-4 text-muted-foreground" />
                </Button>
              }
            />
            <Button
              size="sm"
              disabled={!bulkJudgeId}
              onClick={() => requestAssign(selectedIds, bulkJudgeId, `${selectedIds.length} rapor`)}
              className="transition-transform active:scale-[0.97]"
            >
              Seçilenleri Ata
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
              Seçimi Temizle
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead>Rapor</TableHead>
                <TableHead>Yarışmacı</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Hakem</TableHead>
                <TableHead>Tarih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-base text-muted-foreground">
                    Filtrelerle eşleşen rapor bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => {
                  const category = categories.find((c) => c.id === report.categoryId);
                  const reportEvaluations = evaluations.filter((e) => e.reportId === report.id);
                  const aggregate = aggregateEvaluations(reportEvaluations, []);
                  const latestEvaluation = [...reportEvaluations].sort(
                    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
                  )[0];
                  const availableJudges = judgesForCategory(report.categoryId).filter(
                    (j) => !report.assignedJudgeIds.includes(j.id),
                  );
                  return (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(report.id)}
                          onCheckedChange={() => toggleSelect(report.id)}
                        />
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <p className="truncate font-medium">{report.title}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {report.fileName} &middot; {formatFileSize(report.fileSizeBytes)}
                        </p>
                      </TableCell>
                      <TableCell className="text-base">{report.contestantName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{category?.name ?? "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          <Badge variant="outline" className={STATUS_BADGE_CLASS[report.status]}>
                            {STATUS_LABEL[report.status]}
                          </Badge>
                          <ReportTimeline
                            report={report}
                            evaluation={latestEvaluation}
                            compact
                            className="w-24"
                          />
                          {aggregate?.highDeviation && (
                            <p className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="size-3" />
                              {aggregate.spread} puan fark
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          {report.assignedJudgeIds.map((judgeId) => {
                            const assignedJudge = judges.find((j) => j.id === judgeId);
                            return (
                              <Badge key={judgeId} variant="secondary" className="gap-1 pr-1 text-xs">
                                {assignedJudge?.name ?? "Bilinmeyen"}
                                <button
                                  type="button"
                                  onClick={() => handleUnassign(report.id, judgeId)}
                                  className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                                  aria-label={`${assignedJudge?.name ?? "Hakemi"} kaldır`}
                                >
                                  <X className="size-3" />
                                </button>
                              </Badge>
                            );
                          })}
                          {availableJudges.length > 0 && (
                            <JudgeSearchMenu
                              judges={availableJudges}
                              categoryId={report.categoryId}
                              onSelect={(v) => requestAssign([report.id], v, report.title)}
                              trigger={
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon-sm"
                                  className="h-6 w-6 shrink-0 rounded-full border-dashed"
                                  aria-label="Hakem ekle"
                                >
                                  <Plus className="size-3.5" />
                                </Button>
                              }
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(report.submittedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!pendingAssignment} onOpenChange={(o) => !o && setPendingAssignment(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Atamayı onaylıyor musunuz?</DialogTitle>
            <DialogDescription>
              {pendingAssignment?.label},{" "}
              {judges.find((j) => j.id === pendingAssignment?.judgeId)?.name ?? "seçilen hakeme"}{" "}
              atanacak.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" disabled={assigning} onClick={() => setPendingAssignment(null)}>
              Vazgeç
            </Button>
            <Button
              onClick={confirmAssign}
              disabled={assigning}
              className="gap-1.5 transition-transform active:scale-[0.98]"
            >
              {assigning && <Loader2 className="size-4 animate-spin" />}
              {assigning ? "Atanıyor..." : "Onayla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
