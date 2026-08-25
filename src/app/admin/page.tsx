"use client";

import { useMemo } from "react";
import { CheckCircle2, Clock, FileClock, FileText, Gavel, Sparkles, Users } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { StatCard } from "./_lib/shared";

export default function AdminOverviewPage() {
  const reports = useAppStore((s) => s.reports);
  const users = useAppStore((s) => s.users);

  const judgeCount = useMemo(() => users.filter((u) => u.role === "judge").length, [users]);
  const contestantCount = useMemo(
    () => users.filter((u) => u.role === "contestant").length,
    [users],
  );

  const stats = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((r) => r.status === "pending_assignment").length,
      inReview: reports.filter((r) => r.status === "in_review").length,
      completed: reports.filter((r) => r.status === "completed").length,
      // "Tamamlandı" durumundan farklı — raporun kendi iş akışı durumu
      // değil, Ludex AI analizinin güncel (stale olmayan) bir sonucu olup
      // olmadığını sayar (bkz. Problem 4 "analiz durumlarını izler").
      aiAnalyzed: reports.filter((r) => r.aiEvaluation && !r.aiAnalysisStale).length,
    }),
    [reports],
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Yarışma &amp; Değerlendirme Yöneticisi Girişi Sağlandı
        </h1>
        <p className="mt-1 text-base leading-relaxed text-muted-foreground">
          Rapor havuzunu yönet, hakemlere atama yap, AI analiz ve ilerleme durumunu takip et.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={FileText} label="Toplam Rapor" value={stats.total} />
        <StatCard icon={FileClock} label="Atama Bekliyor" value={stats.pending} accent="amber" />
        <StatCard icon={Clock} label="Değerlendirmede" value={stats.inReview} accent="violet" />
        <StatCard icon={CheckCircle2} label="Tamamlandı" value={stats.completed} accent="emerald" />
        <StatCard
          icon={Sparkles}
          label="AI Analizi"
          value={`${stats.aiAnalyzed} / ${stats.total} Tamamlandı`}
        />
        <StatCard icon={Gavel} label="Toplam Hakem" value={judgeCount} />
        <StatCard icon={Users} label="Toplam Yarışmacı" value={contestantCount} />
      </div>
    </div>
  );
}
