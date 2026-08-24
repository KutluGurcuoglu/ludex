"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getEffectiveCriteria, useAppStore } from "@/store/useAppStore";
import { formatDate, STATUS_BADGE_CLASS, STATUS_LABEL, useViewMode } from "../_lib/shared";

export default function AdminContestantsPage() {
  const categories = useAppStore((s) => s.categories);
  const contestants = useAppStore((s) => s.contestants);
  const reports = useAppStore((s) => s.reports);
  const evaluations = useAppStore((s) => s.evaluations);
  const globalScoreCriteria = useAppStore((s) => s.scoreCriteria);
  const { viewMode } = useViewMode();

  const [contestantSearch, setContestantSearch] = useState("");
  const [selectedContestantId, setSelectedContestantId] = useState<string | null>(null);

  const filteredContestants = useMemo(() => {
    const q = contestantSearch.trim().toLowerCase();
    if (!q) return contestants;
    return contestants.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
    );
  }, [contestants, contestantSearch]);

  const selectedContestant = contestants.find((c) => c.id === selectedContestantId) ?? null;
  const selectedContestantReports = selectedContestant
    ? reports.filter((r) => r.contestantId === selectedContestant.id)
    : [];

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="İsim, telefon veya e-posta ile ara..."
          value={contestantSearch}
          onChange={(e) => setContestantSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
        {filteredContestants.map((contestant) => {
          const contestantReports = reports.filter((r) => r.contestantId === contestant.id);

          if (viewMode === "list") {
            return (
              <Card
                key={contestant.id}
                className="cursor-pointer py-0 transition-colors hover:border-primary/40"
                onClick={() => setSelectedContestantId(contestant.id)}
              >
                <CardContent className="flex items-center gap-4 px-5 py-4">
                  <Avatar>
                    <AvatarFallback>{contestant.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">{contestant.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{contestant.email}</p>
                  </div>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {contestantReports.length} rapor
                  </span>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card
              key={contestant.id}
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => setSelectedContestantId(contestant.id)}
            >
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{contestant.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{contestant.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{contestant.email}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-base">
                  <span className="text-muted-foreground">Gönderilen Rapor</span>
                  <span className="font-semibold">{contestantReports.length}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Sheet open={!!selectedContestantId} onOpenChange={(o) => !o && setSelectedContestantId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selectedContestant && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedContestant.name}</SheetTitle>
                <SheetDescription>
                  {selectedContestant.email} &middot; {selectedContestant.phone}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-4 pb-6">
                {(selectedContestant.school || selectedContestant.department) && (
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-muted-foreground">Eğitim Bilgileri</p>
                    <div className="space-y-1 text-base">
                      {selectedContestant.school && <p>{selectedContestant.school}</p>}
                      {selectedContestant.department && (
                        <p className="text-muted-foreground">
                          {selectedContestant.department}
                          {selectedContestant.grade ? ` · ${selectedContestant.grade}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <p className="mb-2 text-base font-semibold">
                    Gönderilen Raporlar ({selectedContestantReports.length})
                  </p>
                  {selectedContestantReports.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Henüz rapor göndermemiş.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedContestantReports.map((r) => {
                        const evaluation = evaluations.find((e) => e.reportId === r.id);
                        const category = categories.find((c) => c.id === r.categoryId);
                        return (
                          <div key={r.id} className="rounded-lg border border-border p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-base font-medium">{r.title}</p>
                              <Badge variant="outline" className={STATUS_BADGE_CLASS[r.status]}>
                                {STATUS_LABEL[r.status]}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {category?.name ?? "Kategori"} &middot; {formatDate(r.submittedAt)}
                            </p>
                            {evaluation && (
                              <p className="mt-1 text-sm font-medium text-primary">
                                Puan: {evaluation.totalScore} /{" "}
                                {getEffectiveCriteria(category, globalScoreCriteria).reduce(
                                  (sum, c) => sum + c.maxScore,
                                  0,
                                )}
                              </p>
                            )}
                          </div>
                        );
                      })}
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
