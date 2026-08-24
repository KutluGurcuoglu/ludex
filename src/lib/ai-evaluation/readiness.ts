import { getCategoryRepository, type CategoryRecord } from "@/lib/repositories/category-repository";
import { getEffectiveCriteria } from "@/lib/repositories/score-criteria-repository";
import { deriveTemplateSectionFromStorageKey } from "@/lib/text-extraction/report-template";
import { computeContextHash } from "./context-hash";
import type { ReportRecord } from "@/lib/repositories/report-repository";
import type { ScoreCriterion } from "@/types";

/**
 * Kategorinin templateSections'ı boşsa ama daha önce gerçekten bir Rapor
 * Şablonu PDF'i yüklenmişse (ör. bu şablon, /api/categories/:id/report-template
 * bu türetmeyi eklemeden önce yüklenmiş eski bir kategoriyse), aynı
 * deterministik türetmeyi burada da dener ve kalıcı hale getirir — admin'in
 * şablonu yeniden yüklemesini beklemeye gerek kalmaz.
 */
export async function ensureTemplateSections(category: CategoryRecord): Promise<CategoryRecord> {
  if (category.templateSections.length > 0 || !category.reportTemplate?.fileUrl) {
    return category;
  }

  try {
    const section = await deriveTemplateSectionFromStorageKey(category.reportTemplate.fileUrl);
    const updated = await getCategoryRepository().setTemplateSections(category.id, [section]);
    return updated ?? category;
  } catch (error) {
    console.error(`Rapor şablonu otomatik onarım hatası (kategori ${category.id}):`, error);
    return category;
  }
}

export type ReadinessResult =
  | { status: "missing_text"; message: string }
  | { status: "category_not_found"; message: string }
  | { status: "missing_template"; message: string }
  | { status: "missing_criteria"; message: string }
  | {
      status: "ready_not_started";
      message: string;
      category: CategoryRecord;
      effectiveCriteria: ScoreCriterion[];
    }
  | { status: "stale"; message: string; category: CategoryRecord; effectiveCriteria: ScoreCriterion[] }
  | { status: "fresh"; category: CategoryRecord; effectiveCriteria: ScoreCriterion[] };

/**
 * Bir raporun AI analizi için hazır olup olmadığını, tek bir yerden,
 * `/api/reports/:id/evaluate` (409 mesajları) ve `/api/reports/:id/copilot`
 * (readiness cevapları) tarafından ORTAK kullanılacak şekilde çözer — mesaj
 * metinleri iki yerde de birbirinden sapmaz.
 */
export async function resolveReadiness(
  report: ReportRecord,
  globalCriteria: ScoreCriterion[]
): Promise<ReadinessResult> {
  if (!report.extractedText) {
    return { status: "missing_text", message: "Rapor metni henüz çıkarılamamış." };
  }

  let category = await getCategoryRepository().findById(report.categoryId);
  if (!category) {
    return { status: "category_not_found", message: "Rapora ait kategori bulunamadı." };
  }
  category = await ensureTemplateSections(category);

  if (category.templateSections.length === 0) {
    return {
      status: "missing_template",
      message:
        "Bu rapor için analiz henüz başlatılamıyor. Yarışma yöneticisi güncel rapor şablonunu henüz yüklememiş.",
    };
  }

  const effectiveCriteria = getEffectiveCriteria(category, globalCriteria);
  if (effectiveCriteria.length === 0) {
    return { status: "missing_criteria", message: "Değerlendirme kriterleri tanımlı değil." };
  }

  if (!report.aiEvaluation) {
    return {
      status: "ready_not_started",
      message: "Bu rapor analiz edilmeye hazır ancak Ludex analizi henüz başlatılmamış.",
      category,
      effectiveCriteria,
    };
  }

  const currentHash = computeContextHash({
    specificationText: category.specificationText,
    templateSections: category.templateSections,
    criteria: effectiveCriteria,
  });
  if (report.aiEvaluation.contextHash !== currentHash) {
    return {
      status: "stale",
      message: "Yarışma yönergeleri analizden sonra değiştirildi. Analizi yeniden çalıştırmalısın.",
      category,
      effectiveCriteria,
    };
  }

  return { status: "fresh", category, effectiveCriteria };
}
