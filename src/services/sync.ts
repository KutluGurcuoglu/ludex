import { useAppStore } from "@/store/useAppStore";
import * as reportsService from "./reports.service";
import * as categoriesService from "./categories.service";
import * as evaluationsService from "./evaluations.service";

/**
 * Sayfalar hâlâ useAppStore selector'larından okuyor (bkz. reports/categories/
 * evaluations/scoreCriteria kullanan tüm bileşenler); gerçek backend'e sahip
 * bir servis fonksiyonu çağırmak tek başına ekrana hiçbir şey yansıtmaz.
 * Bu fonksiyonlar fetch + store'a yazma işini birlikte yapar — hem ilk
 * yüklemede hem her mutasyondan sonra çağrılmalı.
 */

export async function refreshReports(): Promise<void> {
  const reports = await reportsService.getReports();
  useAppStore.getState().setReports(reports);
}

export async function refreshCategories(): Promise<void> {
  const categories = await categoriesService.getCategories();
  useAppStore.getState().setCategories(categories);
}

export async function refreshEvaluations(): Promise<void> {
  const evaluations = await evaluationsService.getEvaluations();
  useAppStore.getState().setEvaluations(evaluations);
}

export async function refreshScoreCriteria(): Promise<void> {
  const criteria = await evaluationsService.getScoreCriteria();
  useAppStore.getState().setScoreCriteria(criteria);
}
