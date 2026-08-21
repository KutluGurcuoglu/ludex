"use client";

import { useEffect } from "react";
import { useAppStore, useHasHydrated } from "@/store/useAppStore";

const CHECK_INTERVAL_MS = 30_000;

/**
 * Gerçek bir backend/cron olmadığından, admin'in bir kategori için planladığı sonuç
 * yayın tarihinin geçip geçmediğini istemci tarafında periyodik olarak kontrol eder.
 * Uygulama açık değilken tarih geçerse, bir sonraki açılışta hemen yayınlanır.
 */
export function ResultsReleaseWatcher() {
  const hydrated = useHasHydrated();

  useEffect(() => {
    if (!hydrated) return;
    useAppStore.getState().checkScheduledReleases();
    const interval = setInterval(() => {
      useAppStore.getState().checkScheduledReleases();
    }, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hydrated]);

  return null;
}
