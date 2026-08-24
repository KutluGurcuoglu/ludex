import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getReportRepository } from "@/lib/repositories/report-repository";
import {
  getCategoryRepository,
  type CategoryEvaluationCriterion,
  type CategoryRecord,
} from "@/lib/repositories/category-repository";
import {
  getScoreCriteriaRepository,
  getEffectiveCriteria,
} from "@/lib/repositories/score-criteria-repository";
import { evaluateReport } from "@/lib/ai-evaluation/evaluate";
import { findSimilarReports } from "@/lib/ai-evaluation/similarity";
import { deriveTemplateSectionFromStorageKey } from "@/lib/text-extraction/report-template";
import type { ScoreCriterion } from "@/types";

/**
 * Kategorinin templateSections'ı boşsa ama daha önce gerçekten bir Rapor
 * Şablonu PDF'i yüklenmişse (ör. bu şablon, /api/categories/:id/report-template
 * bu türetmeyi eklemeden önce yüklenmiş eski bir kategoriyse), aynı
 * deterministik türetmeyi burada da dener ve kalıcı hale getirir — admin'in
 * şablonu yeniden yüklemesini beklemeye gerek kalmaz.
 */
async function ensureTemplateSections(category: CategoryRecord): Promise<CategoryRecord> {
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

/** Hakemin puanladığı efektif kriterleri (kategoriye özel ya da global), AI'nın beklediği şekle çevirir. */
function toAiCriteria(criteria: ScoreCriterion[]): CategoryEvaluationCriterion[] {
  return criteria.map((c) => ({
    id: c.id,
    name: c.label,
    description: c.description?.trim() || c.label,
    maxScore: c.maxScore,
  }));
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("admin", "judge");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const { id } = await params;
  const reportRepository = getReportRepository();
  const report = await reportRepository.findById(id);
  if (!report) {
    return NextResponse.json({ error: "Rapor bulunamadı." }, { status: 404 });
  }

  // Hakem yalnızca kendisine atanmış raporu değerlendirebilir; admin her raporu tetikleyebilir.
  if (session.user.role === "judge" && !report.assignedJudgeIds.includes(session.user.id)) {
    return NextResponse.json({ error: "Bu rapor size atanmamış." }, { status: 403 });
  }

  if (!report.extractedText) {
    return NextResponse.json(
      { error: "Rapor metni henüz çıkarılmamış, AI değerlendirmesi başlatılamaz." },
      { status: 409 }
    );
  }

  let category = await getCategoryRepository().findById(report.categoryId);
  if (!category) {
    return NextResponse.json({ error: "Rapora ait kategori bulunamadı." }, { status: 404 });
  }

  // templateSections, admin panelinde ayrıca elle girilmiyor — gerçek kaynak
  // admin'in zaten yüklediği Rapor Şablonu PDF'idir (bkz. ensureTemplateSections).
  category = await ensureTemplateSections(category);

  // AI kriterleri, hakemin raporu puanlarken kullandığı TAM AYNI kaynaktan
  // gelir (getEffectiveCriteria: kategoriye özel Category.criteria varsa o,
  // yoksa global ScoreCriterion listesi) — ayrı, kullanıcının göremediği bir
  // evaluationCriteria alanı artık zorunlu değil.
  const globalCriteria = await getScoreCriteriaRepository().listAll();
  const effectiveCriteria = getEffectiveCriteria(category, globalCriteria);

  if (category.templateSections.length === 0 || effectiveCriteria.length === 0) {
    return NextResponse.json(
      {
        error:
          "Bu kategori için rapor şablonu ve/veya değerlendirme kriterleri henüz tanımlanmamış. Önce yarışma düzenleme panelinden Rapor Şablonu PDF'i yükleyin ve en az bir değerlendirme kriteri tanımlayın.",
      },
      { status: 409 }
    );
  }

  try {
    const evaluation = await evaluateReport({
      reportContent: report.extractedText,
      category: category.name,
      template: { sections: category.templateSections },
      evaluationCriteria: toAiCriteria(effectiveCriteria),
    });

    // Benzerlik LLM tarafından üretilmez — deterministik olarak burada
    // hesaplanır ve aynı AI analiz kaydına (AIAnalysis) eklenir. Yalnızca
    // aynı kategorideki, extractedText'i dolu, kendisi olmayan raporlarla
    // karşılaştırılır (bkz. src/lib/ai-evaluation/similarity.ts).
    const allReports = await reportRepository.listAll();
    const candidates = allReports.filter(
      (r) => r.categoryId === report.categoryId && Boolean(r.extractedText)
    );
    const similarReports = findSimilarReports(
      { id: report.id, extractedText: report.extractedText },
      candidates.map((r) => ({ id: r.id, title: r.title, extractedText: r.extractedText ?? "" }))
    );
    const enrichedEvaluation = {
      ...evaluation,
      similarReports,
      similarityScore: similarReports[0]?.matchPercentage,
    };

    await reportRepository.setAiEvaluation(report.id, enrichedEvaluation);
    if (report.status === "assigned") {
      await reportRepository.setStatus(report.id, "in_review");
    }

    return NextResponse.json({ success: true, evaluation: enrichedEvaluation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz değerlendirme girdisi.", issues: error.issues },
        { status: 400 }
      );
    }

    console.error(`AI değerlendirme hatası (report ${report.id}):`, error);
    return NextResponse.json({ error: "AI değerlendirmesi başarısız oldu." }, { status: 500 });
  }
}
