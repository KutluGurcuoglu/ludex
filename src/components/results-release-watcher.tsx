"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAppStore, useHasHydrated } from "@/store/useAppStore";
import * as categoriesService from "@/services/categories.service";
import { refreshCategories, refreshEvaluations } from "@/services/sync";

const CHECK_INTERVAL_MS = 30_000;

async function checkScheduledReleases(): Promise<void> {
  const categories = useAppStore.getState().categories;
  const now = Date.now();
  const due = categories.filter(
    (c) =>
      c.resultsReleaseAt &&
      new Date(c.resultsReleaseAt).getTime() <= now &&
      (!c.resultsReleasedAt ||
        new Date(c.resultsReleasedAt).getTime() < new Date(c.resultsReleaseAt).getTime()),
  );
  if (due.length === 0) return;

  await Promise.all(due.map((c) => categoriesService.releaseCategoryResults(c.id)));
  await Promise.all([refreshCategories(), refreshEvaluations()]);
}

/**
 * Gerçek bir backend/cron olmadığından, admin'in bir kategori için planladığı sonuç
 * yayın tarihinin geçip geçmediğini istemci tarafında periyodik olarak kontrol eder.
 * Yayınlama uç noktası admin-only olduğu için yalnızca admin oturumunda çalışır.
 * Uygulama açık değilken tarih geçerse, bir sonraki admin girişinde hemen yayınlanır.
 */
export function ResultsReleaseWatcher() {
  const hydrated = useHasHydrated();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    if (!hydrated || !isAdmin) return;

    const run = () => {
      checkScheduledReleases().catch((error) => {
        console.error("Zamanlanmış sonuç yayını kontrolü başarısız:", error);
      });
    };

    run();
    const interval = setInterval(run, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hydrated, isAdmin]);

  return null;
}
